import { PowerStore } from './power.store';
import { averageColor, smallCover } from '@data/utils/cover';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { computed, inject, Injectable, signal } from '@angular/core';
import { SpotifyState } from '@data/models/spotify-state.model';
import { SpotifyService } from '@data/services/spotify.service';
import {
    catchError,
    distinctUntilChanged,
    EMPTY,
    filter,
    merge,
    Observable,
    of,
    skip,
    Subject,
    switchMap,
} from 'rxjs';

// What Spotify Connect on the Pi is playing. The Pi taps F15 on every change (see
// pi/spotify-event.py) and the TV component calls refresh(). While the TV is on, a light check
// every 15 seconds also corrects anything that slipped through, like a dropped connection.
const CHECK_EVERY = 1000 * 15;

const sameState = (a: SpotifyState | undefined, b: SpotifyState | undefined): boolean =>
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

@Injectable({ providedIn: 'root' })
export class SpotifyStore {
    private readonly spotifyService = inject(SpotifyService);
    private readonly power = inject(PowerStore);

    private readonly refreshes = new Subject<void>();

    // Only a real change updates the screen, not every check
    public readonly state = signal<SpotifyState | undefined>(undefined, { equal: sameState });

    public readonly cover = computed(() => {
        const state = this.state();

        return state?.active && state.cover ? smallCover(state.cover) : '';
    });

    // The cover's colour, which tints the music widgets. Undefined until the cover has loaded.
    public readonly coverColor = signal<string | undefined>(undefined);

    constructor() {
        merge(
            // Now, whenever the TV comes back, and every 15 seconds while it's on
            this.power.poll(CHECK_EVERY),
            this.refreshes,
        )
            .pipe(
                // A track change brings several refreshes at once: only the newest answer counts,
                // so a slow earlier one can't put the previous song back
                switchMap(() => this.fetch()),
                takeUntilDestroyed(),
            )
            .subscribe((state) => this.state.set(state));

        // Nobody hears Spotify while the TV is off or on another input: let go of the phone, like a
        // Bluetooth speaker that's switched off. The song stays paused on the phone.
        this.power.awake$
            .pipe(
                distinctUntilChanged(),
                skip(1),
                filter((awake) => !awake && !!this.state()?.active),
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

    public refresh(): void {
        this.refreshes.next();
    }

    // Pauses, and takes the Pi off Spotify for a few seconds (see pi/spotify-disconnect.sh): the
    // phone then drops it, like a Bluetooth speaker that's switched off
    public disconnect(): void {
        this.spotifyService
            .disconnect()
            .pipe(catchError(() => EMPTY))
            .subscribe();
    }

    // No file yet means Spotify hasn't been used since the Pi started
    private fetch(): Observable<SpotifyState> {
        return this.spotifyService.getState().pipe(catchError(() => EMPTY));
    }
}
