import { PowerStore } from './power.store';
import { SpotifyStore } from './spotify.store';
import { formatTime } from '@data/utils/time';
import { Digit } from '@data/models/keyboard-event-key.type';
import { NowPlaying } from '@data/models/radio-channel.model';
import { RadioService } from '@data/services/radio.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
    catchError,
    distinctUntilChanged,
    EMPTY,
    map,
    merge,
    pairwise,
    skip,
    Subject,
    switchMap,
} from 'rxjs';

export interface PlayedSong {
    song: string;
    artist: string;
    station: string; // HTML, see RadioChannel.visibleName
    time: string;
}

const HISTORY_LENGTH = 5;

// The stations' "now playing" APIs
const REFRESH = 1000 * 30;

// Like a TV: after the first digit, how long to wait for a second one
const NEXT_DIGIT_WAIT = 1500;

// What plays on the TV: an internet radio station, streamed here, or Spotify on the Pi (see
// SpotifyStore). Spotify is the first channel, but the TV starts on the first station: KINK.
@Injectable({ providedIn: 'root' })
export class RadioStore {
    private readonly radioService = inject(RadioService);
    private readonly power = inject(PowerStore);
    private readonly spotify = inject(SpotifyStore);
    private readonly audio = new Audio();
    private readonly songRequests = new Subject<void>();

    public readonly channels = this.radioService.radioChannels;
    public readonly spotifyIndex = this.channels.findIndex(
        (channel) => channel.apiSrc === 'SPOTIFY',
    );

    public readonly firstStation = this.channels.findIndex(
        (channel) => channel.apiSrc !== 'SPOTIFY',
    );

    public readonly channelIndex = signal(this.firstStation);
    public readonly channel = computed(() => this.channels[this.channelIndex()]);
    public readonly isSpotify = computed(() => this.channelIndex() === this.spotifyIndex);

    // The station's song, from its API
    private readonly stationSong = signal<NowPlaying | undefined>(undefined);
    // The stream: started (and not paused with the yellow button), and actually sounding
    private readonly streaming = signal(false);
    private readonly sounding = signal(false);
    // The kiosk allows autoplay, but a regular browser only plays audio after a key press or click
    public readonly blocked = signal(false);

    public readonly history = signal<PlayedSong[]>([]);
    private current: PlayedSong | undefined;

    // The station number being typed on the remote, and the station it would pick
    public readonly typedNumber = signal('');
    public readonly typedChannel = computed(() => {
        const typed = this.typedNumber();

        return typed ? this.channels[Number(typed) - 1] : undefined;
    });

    private typingTimer: ReturnType<typeof setTimeout> | undefined;

    // The playing indicator: the stream here, or Spotify on the Pi
    public readonly isPlaying = computed(() =>
        this.isSpotify() ? this.spotify.state().playing : this.sounding(),
    );

    // Only Spotify has covers, the stations' APIs don't
    public readonly cover = computed(() => (this.isSpotify() ? this.spotify.cover() : ''));
    public readonly coverColor = computed(() =>
        this.isSpotify() ? this.spotify.coverColor() : undefined,
    );

    private readonly track = computed<NowPlaying | undefined>(() => {
        if (!this.isSpotify()) return this.stationSong();

        const state = this.spotify.state();

        return state.active ? { song: state.title, artist: state.artist } : undefined;
    });

    public readonly song = computed(() => this.track()?.song ?? '');
    public readonly artist = computed(() => this.track()?.artist ?? '');

    constructor() {
        this.audio.volume = 0.5;
        this.audio.addEventListener('playing', () => this.sounding.set(true));
        this.audio.addEventListener('pause', () => this.sounding.set(false));
        this.audio.addEventListener('waiting', () => this.sounding.set(false));

        inject(DestroyRef).onDestroy(() => {
            clearTimeout(this.typingTimer);
            this.stopStream();
        });

        // Nobody hears HDMI audio while the TV is off or on another input: drop the stream then,
        // and pick it up again when the TV comes back. Spotify lets go of a phone then (see
        // SpotifyStore), so the TV comes back on the first station.
        this.power.awake$
            .pipe(distinctUntilChanged(), skip(1), takeUntilDestroyed())
            .subscribe((awake) => {
                if (awake) {
                    this.start();
                    return;
                }

                if (this.isSpotify()) this.leaveSpotify();
                this.stopStream();
            });

        // Spotify playing takes over from the radio, like switching to a channel: casting from the
        // phone, or a playlist from the channel list. Also while the TV is off: when casting turns
        // it on (see SpotifyStore), Spotify is already the channel and the radio stays quiet.
        toObservable(this.spotify.state)
            .pipe(pairwise(), takeUntilDestroyed())
            .subscribe(([previous, state]) => {
                if (state.playing && !this.isSpotify()) {
                    this.switchTo(this.spotifyIndex);
                }

                // Spotify let go (a phone disconnected, or it stopped): back to the first station
                if (previous.active && !state.active && this.isSpotify()) {
                    if (this.power.awake()) this.playChannel(this.firstStation);
                    else this.leaveSpotify();
                }

                this.recordSong();
            });

        // Every 30 seconds while the TV is on, and right away on another channel. A newer request
        // replaces an older one, and an answer only counts for the channel it was asked for.
        merge(this.power.poll(REFRESH), this.songRequests)
            .pipe(
                switchMap(() => {
                    const channel = this.channel();

                    return this.radioService.getNowPlaying(channel).pipe(
                        map((song) => ({ channel, song })),
                        // A station's API that doesn't answer keeps the last song on screen
                        catchError(() => EMPTY),
                    );
                }),
                takeUntilDestroyed(),
            )
            .subscribe(({ channel, song }) => {
                if (channel !== this.channel()) return;

                this.stationSong.set(song);
                this.recordSong();
            });
    }

    // Plays what the current channel streams: nothing for Spotify, the phone or the channel list
    // decides what plays there
    public start(): void {
        if (this.isSpotify()) {
            this.stopStream();
            return;
        }

        this.streaming.set(true);
        this.audio.src = this.channel().file;
        this.audio
            .play()
            .then(() => this.blocked.set(false))
            .catch((error: unknown) => {
                // Other rejections, like switching channels mid-load, sort themselves out
                if (error instanceof DOMException && error.name === 'NotAllowedError') {
                    this.blocked.set(true);
                }
            });
    }

    // Any interaction unlocks audio, so retry on the first one
    public startIfBlocked(): void {
        if (this.blocked()) this.start();
    }

    public playChannel(index: number): void {
        if (index < 0 || index >= this.channels.length) return;

        this.switchTo(index);

        // A radio station takes over from Spotify: stop it, and let go of a phone, like a
        // Bluetooth speaker that's switched off, so the two never play at the same time
        if (!this.isSpotify() && this.spotify.state().active) {
            this.spotify.disconnect();
        }

        this.start();
        this.songRequests.next();
    }

    // Channel up and down, round the list
    public step(step: number): void {
        const count = this.channels.length;

        this.playChannel((this.channelIndex() + step + count) % count);
    }

    // OK on the remote: Spotify pauses and resumes, the radio stops and starts again (live)
    public playPause(): void {
        if (this.isSpotify()) {
            this.spotify.playPause();
        } else if (this.streaming()) {
            this.stopStream();
        } else {
            this.start();
        }
    }

    // Stations are numbered from 1. A digit that can't start a longer number switches right away
    // (with 14 stations: 2 to 9, or 1 then 4); otherwise the TV waits a moment for the next one.
    public typeDigit(digit: Digit): void {
        clearTimeout(this.typingTimer);

        const count = this.channels.length;
        let typed = this.typedNumber() + digit;

        // Past the last station, the new digit starts a new number
        if (Number(typed) > count) typed = digit;

        if (Number(typed) < 1) {
            this.typedNumber.set('');
            return;
        }

        this.typedNumber.set(typed);

        if (Number(typed) * 10 > count) {
            this.playTyped();
        } else {
            this.typingTimer = setTimeout(() => this.playTyped(), NEXT_DIGIT_WAIT);
        }
    }

    private playTyped(): void {
        const index = Number(this.typedNumber()) - 1;

        this.typedNumber.set('');
        this.playChannel(index);
    }

    private switchTo(index: number): void {
        this.stationSong.set(undefined);
        this.channelIndex.set(index);

        if (this.isSpotify()) this.stopStream();
    }

    // Spotify has let go (or is about to): back to the first station, which plays when the TV
    // comes back
    private leaveSpotify(): void {
        this.stationSong.set(undefined);
        this.channelIndex.set(this.firstStation);
    }

    private stopStream(): void {
        this.streaming.set(false);
        // Without a source the browser closes the connection to the stream as well
        this.audio.pause();
        this.audio.removeAttribute('src');
        this.audio.load();
    }

    // When a new song starts, the previous one moves to the history
    private recordSong(): void {
        const song = this.song();
        const artist = this.artist();

        if (!song || (song === this.current?.song && artist === this.current?.artist)) {
            return;
        }

        const previous = this.current;

        if (previous) {
            this.history.update((history) => [previous, ...history].slice(0, HISTORY_LENGTH));
        }

        this.current = {
            song,
            artist,
            station: this.channel().visibleName,
            time: formatTime(new Date()),
        };
    }
}
