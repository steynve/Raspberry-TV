import { PowerStore } from './power.store';
import { TvService } from '@data/services/tv.service';
import { averageColor, smallCover } from '@data/utils/cover';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { computed, inject, Injectable, signal } from '@angular/core';
import { SpotifyState } from '@data/models/spotify-state.model';
import {
    SpotifyEvent,
    SpotifyPairing,
    SpotifyPlaylist,
    SpotifyService,
    SpotifyStatus,
    SpotifyTrack,
} from '@data/services/spotify.service';
import {
    catchError,
    distinctUntilChanged,
    EMPTY,
    filter,
    map,
    mergeMap,
    Observable,
    of,
    repeat,
    skip,
    switchMap,
    tap,
} from 'rxjs';

// go-librespot restarts in 5 seconds when it stops (see pi/go-librespot.service): try again as often
const RECONNECT = 1000 * 5;

// Every new connection plays at full volume: the connection's own, not the Pi's or the TV's
const FULL_VOLUME = 100;

// Turning the TV off stops Spotify, but the stop takes a moment. A song that starts in that moment
// shouldn't turn the TV right back on.
const TV_OFF_GRACE = 1000 * 10;

export const INACTIVE: SpotifyState = {
    active: false,
    playing: false,
    title: '',
    artist: '',
    album: '',
    cover: '',
    context: '',
    position: 0,
    positionAt: 0,
    duration: 0,
};

const fromTrack = (track: SpotifyTrack, now: number): Partial<SpotifyState> => ({
    title: track.name,
    artist: track.artist_names.join(', '),
    album: track.album_name,
    cover: track.album_cover_url ?? '',
    position: track.position,
    positionAt: now,
    duration: track.duration,
});

// Where the song is now, in ms
export const positionNow = (state: SpotifyState, now: number): number =>
    Math.min(
        state.duration,
        state.position + (state.playing ? Math.max(0, now - state.positionAt) : 0),
    );

// Signed in with nothing loaded is inactive too, like no status at all (not signed in)
const fromStatus = (status: SpotifyStatus | null, now: number): SpotifyState =>
    status?.track
        ? {
              ...INACTIVE,
              active: true,
              playing: !status.paused && !status.stopped,
              context: status.context_uri ?? '',
              ...fromTrack(status.track, now),
          }
        : INACTIVE;

const applyEvent = (state: SpotifyState, event: SpotifyEvent, now: number): SpotifyState => {
    switch (event.type) {
        case 'active':
            return { ...state, active: true };
        case 'inactive':
            return INACTIVE;
        case 'metadata':
            return { ...state, active: true, ...fromTrack(event.data as SpotifyTrack, now) };
        case 'seek': {
            const { position, duration } = event.data as { position: number; duration: number };
            return { ...state, position, duration, positionAt: now };
        }
        case 'playing': {
            const context = (event.data as { context_uri?: string } | undefined)?.context_uri;
            // Resumed: the position stood still while paused
            const positionAt = state.playing ? state.positionAt : now;
            return {
                ...state,
                active: true,
                playing: true,
                context: context ?? state.context,
                positionAt,
            };
        }
        // Not "not_playing": a song that ends is followed by the next, and the cover shouldn't
        // dim in between. "stopped" follows when there's nothing more to play.
        case 'paused':
        case 'stopped':
            return { ...state, playing: false, position: positionNow(state, now), positionAt: now };
        default:
            return state;
    }
};

const sameState = (a: SpotifyState, b: SpotifyState): boolean =>
    JSON.stringify(a) === JSON.stringify(b);

// Loaded with CORS, like the <img> that shows it, so the browser downloads the cover only once
const loadColor = (url: string): Observable<string | undefined> =>
    new Observable((subscriber) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = (): void => {
            subscriber.next(averageColor(image));
            subscriber.complete();
        };
        image.onerror = (): void => {
            subscriber.next(undefined);
            subscriber.complete();
        };
        image.src = url;

        return (): void => {
            image.onload = image.onerror = null;
        };
    });

// What Spotify Connect on the Pi (go-librespot) is playing, and the controls for the remote. It
// pushes every change over a WebSocket, so the screen follows the phone right away without asking.
// The connection stays open while the TV is off: casting then turns the TV on.
@Injectable({ providedIn: 'root' })
export class SpotifyStore {
    private readonly spotifyService = inject(SpotifyService);
    private readonly tv = inject(TvService);
    private readonly power = inject(PowerStore);

    // Only a real change updates the screen
    public readonly state = signal<SpotifyState>(INACTIVE, { equal: sameState });

    public readonly cover = computed(() => {
        const state = this.state();

        return state.active && state.cover ? smallCover(state.cover) : '';
    });

    // The cover's colour, which tints the music widgets. Undefined until the cover has loaded.
    public readonly coverColor = signal<string | undefined>(undefined);

    // The account the Pi is signed in to, see loadLibrary(). While it isn't, the pairing to sign in.
    public readonly signedIn = signal(false);
    public readonly username = signal('');
    public readonly pairing = signal<SpotifyPairing | null>(null);
    public readonly playlists = signal<SpotifyPlaylist[]>([]);

    // Liked Songs, which isn't in the list of playlists
    public readonly likedSongs = computed(() => `spotify:user:${this.username()}:collection`);

    // Turning the TV on once is enough, until it next turns off
    private tvTurnedOn = false;

    constructor() {
        this.spotifyService
            .events()
            .pipe(
                // go-librespot restarted, or isn't running yet: connect again
                repeat({ delay: RECONNECT }),
                mergeMap((event) => this.updateFor(event)),
                takeUntilDestroyed(),
            )
            .subscribe((update) => this.state.update(update));

        // Nobody hears Spotify while the TV is off or on another input: let go of the phone, like
        // a Bluetooth speaker that's switched off
        this.power.awake$
            .pipe(
                distinctUntilChanged(),
                skip(1),
                tap(() => (this.tvTurnedOn = false)),
                filter((awake) => !awake && this.state().active),
                takeUntilDestroyed(),
            )
            .subscribe(() => this.disconnect());

        toObservable(this.cover)
            .pipe(
                switchMap((cover) => (cover ? loadColor(cover) : of(undefined))),
                takeUntilDestroyed(),
            )
            .subscribe((color) => this.coverColor.set(color));
    }

    // Stops Spotify and ends the session: a phone drops the Pi, and keeps the song paused itself
    public disconnect(): void {
        this.send(this.spotifyService.stop());
    }

    public play(uri: string): void {
        this.send(this.spotifyService.play(uri));
    }

    public playPause(): void {
        this.send(this.spotifyService.playPause());
    }

    public next(): void {
        this.send(this.spotifyService.next());
    }

    public previous(): void {
        this.send(this.spotifyService.previous());
    }

    // The account and its playlists, fresh whenever the Spotify list opens. Without an account, the
    // code to link one (see pi/go-librespot.yml).
    public loadLibrary(): void {
        this.spotifyService
            .getStatus()
            .pipe(
                // While it waits for its account to be linked, it doesn't answer at all (503)
                catchError(() => of(null)),
                tap((status) => {
                    this.signedIn.set(!!status);
                    this.username.set(status?.username ?? '');
                }),
                switchMap((status) =>
                    status
                        ? this.spotifyService
                              .getPlaylists()
                              .pipe(tap((playlists) => this.playlists.set(playlists)))
                        : this.spotifyService
                              .getPairing()
                              .pipe(tap((pairing) => this.pairing.set(pairing))),
                ),
                catchError(() => EMPTY),
            )
            .subscribe();
    }

    private send(request: Observable<unknown>): void {
        request.pipe(catchError(() => EMPTY)).subscribe();
    }

    // How an event changes the state, and what it sets off
    private updateFor(event: SpotifyEvent): Observable<(state: SpotifyState) => SpotifyState> {
        // Connected (again): catch up on what happened in the meantime
        if (event.type === 'open') {
            return this.spotifyService.getStatus().pipe(
                map((status) => () => fromStatus(status, Date.now())),
                catchError(() => EMPTY),
            );
        }

        if (event.type === 'active') {
            this.send(this.spotifyService.setVolume(FULL_VOLUME));
        }

        if (event.type === 'playing') {
            this.turnOnTv();
        }

        return of((state: SpotifyState) => applyEvent(state, event, Date.now()));
    }

    // Casting while the TV is off turns it on and switches it to the Pi, like a Chromecast: the TV
    // is the Pi's speaker
    private turnOnTv(): void {
        if (this.tvTurnedOn || this.power.asleepFor() <= TV_OFF_GRACE) return;

        this.tvTurnedOn = true;
        this.send(this.tv.turnOn());
    }
}
