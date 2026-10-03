import { catchError, distinctUntilChanged, EMPTY, pairwise, skip, Subject } from 'rxjs';
import { NowPlaying } from '@data/models/radio-channel.model';
import { RadioService } from '@data/services/radio.service';
import { PowerStore } from '@data/stores/power.store';
import { SpotifyStore } from '@data/stores/spotify.store';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Digit, isDigit, KeyboardEventKey, YELLOW } from '@data/models/keyboard-event-key.type';
import { IconComponent } from '@shared/components/icon/icon.component';
import { formatTime } from '@data/utils/time';
import { TvSystemComponent } from '../tv-system/tv-system.component';
import {
    afterNextRender,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    OnInit,
    signal,
    viewChild,
} from '@angular/core';

export interface PlayedSong {
    song: string;
    artist: string;
    station: string; // HTML, see RadioChannel.visibleName
    time: string;
}

const HISTORY_LENGTH = 5;

// Like a TV: after the first digit, how long to wait for a second one
const NEXT_DIGIT_WAIT = 1500;

@Component({
    selector: 'app-tv-radio',
    templateUrl: './tv-radio.component.html',
    styleUrl: './tv-radio.component.scss',
    imports: [IconComponent, TvSystemComponent],
    host: {
        '(document:keydown)': 'startIfBlocked()',
        '(document:pointerdown)': 'startIfBlocked()',
    },
})
export class TvRadioComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly radioService = inject(RadioService);
    private readonly power = inject(PowerStore);
    private readonly spotify = inject(SpotifyStore);
    private readonly radioElement =
        viewChild.required<ElementRef<HTMLAudioElement>>('radioElement');

    public readonly keyDownSubject = input.required<Subject<KeyboardEventKey>>();
    public readonly overlay = input(false);

    public readonly radioChannels = this.radioService.radioChannels;
    public readonly nowPlaying = signal<NowPlaying | undefined>(undefined);
    public readonly nowPlayingChannelIndex = signal(0);
    public readonly selectedChannelIndex = signal(0);
    public readonly playing = signal(false);
    // The kiosk allows autoplay, but a regular browser only plays audio after a key press or click
    public readonly blocked = signal(false);
    public readonly history = signal<PlayedSong[]>([]);
    private current: PlayedSong | undefined;
    private previousChannelIndex: number | undefined;

    // The station number being typed on the remote, and the station it would pick
    public readonly typedNumber = signal('');
    public readonly typedChannel = computed(() => {
        const typed = this.typedNumber();

        return typed ? this.radioChannels[Number(typed) - 1] : undefined;
    });

    private typingTimer: ReturnType<typeof setTimeout> | undefined;

    public readonly nowPlayingChannel = computed(
        () => this.radioChannels[this.nowPlayingChannelIndex()],
    );

    public readonly spotifyChannelIndex = this.radioChannels.findIndex(
        (channel) => channel.apiSrc === 'SPOTIFY',
    );

    public readonly isSpotify = computed(() => this.nowPlayingChannel().apiSrc === 'SPOTIFY');

    // The playing indicator: the stream on this page, or Spotify on the Pi
    public readonly isPlaying = computed(() =>
        this.isSpotify() ? this.spotify.state().playing : this.playing(),
    );

    // Only Spotify has covers, the stations' APIs don't
    public readonly nowPlayingCover = computed(() =>
        this.isSpotify() ? this.spotify.cover() : '',
    );

    public readonly nowPlayingCoverColor = computed(() =>
        this.isSpotify() ? this.spotify.coverColor() : undefined,
    );

    // The song from the station's API, or from Spotify on the Pi
    private readonly track = computed<NowPlaying | undefined>(() => {
        if (!this.isSpotify()) return this.nowPlaying();

        const state = this.spotify.state();

        return state.active ? { song: state.title, artist: state.artist } : undefined;
    });

    public readonly nowPlayingSong = computed(() => this.track()?.song ?? '');
    public readonly nowPlayingArtist = computed(() => this.track()?.artist ?? '');

    constructor() {
        afterNextRender(() => this.startRadio());

        // Nobody hears HDMI audio while the TV is off or on another input: drop the stream then,
        // and pick it up again when the TV comes back. Spotify lets go of the phone then (see
        // SpotifyStore), so the TV comes back on the first station.
        this.power.awake$
            .pipe(distinctUntilChanged(), skip(1), takeUntilDestroyed())
            .subscribe((awake) => {
                if (awake) {
                    this.startRadio();
                    return;
                }

                this.leaveSpotify();
                this.stopRadio();
            });

        this.destroyRef.onDestroy(() => clearTimeout(this.typingTimer));

        // Casting from the Spotify app takes over from the radio, like switching to a channel. Also
        // while the TV is off: when casting turns it on (see SpotifyStore), Spotify is already the
        // channel and the radio stays quiet.
        toObservable(this.spotify.state)
            .pipe(pairwise(), takeUntilDestroyed())
            .subscribe(([previous, state]) => {
                if (state.playing) {
                    this.switchToSpotify();
                }

                // The phone let go of the Pi: back to the first station
                if (previous.active && !state.active && this.isSpotify()) {
                    if (this.power.awake()) this.playChannel(0);
                    else this.leaveSpotify();
                }

                this.recordSong();
            });
    }

    // Spotify has let go of the phone (or is about to): back to the first station, which plays
    // when the TV or the radio comes back
    public leaveSpotify(): void {
        if (!this.isSpotify()) return;

        this.nowPlaying.set(undefined);
        this.nowPlayingChannelIndex.set(0);
        this.selectedChannelIndex.set(0);
    }

    public switchToSpotify(): void {
        if (this.isSpotify()) return;

        this.previousChannelIndex = this.nowPlayingChannelIndex();
        this.nowPlaying.set(undefined);
        this.nowPlayingChannelIndex.set(this.spotifyChannelIndex);
        this.selectedChannelIndex.set(this.spotifyChannelIndex);
        this.stopRadio();
    }

    public startRadio(): void {
        // Spotify plays on the Pi itself, the phone decides what
        if (this.isSpotify()) {
            this.stopRadio();
            return;
        }

        const radio = this.radioElement().nativeElement;

        radio.src = this.nowPlayingChannel().file;
        radio.volume = 0.5;
        radio
            .play()
            .then(() => this.blocked.set(false))
            .catch((error: unknown) => {
                // Other rejections, like switching channels mid-load, sort themselves out
                if (error instanceof DOMException && error.name === 'NotAllowedError') {
                    this.blocked.set(true);
                }
            });
    }

    public stopRadio(): void {
        const radio = this.radioElement().nativeElement;

        // Without a source the browser closes the connection to the stream as well
        radio.pause();
        radio.removeAttribute('src');
        radio.load();
    }

    // Any interaction unlocks audio, so retry on the first one
    public startIfBlocked(): void {
        if (this.blocked()) {
            this.startRadio();
        }
    }

    public getNowPlaying(): void {
        this.radioService
            .getNowPlaying(this.nowPlayingChannel())
            // A station's API that doesn't answer keeps the last song on screen
            .pipe(
                catchError(() => EMPTY),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((response) => {
                this.nowPlaying.set(response);
                this.recordSong();
            });
    }

    // When a new song starts, the previous one moves to the history
    public recordSong(): void {
        const song = this.nowPlayingSong();
        const artist = this.nowPlayingArtist();

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
            station: this.nowPlayingChannel().visibleName,
            time: formatTime(new Date()),
        };
    }

    public setSelectedChannel(selectedChannelIndex: number): void {
        if (selectedChannelIndex >= this.radioChannels.length || selectedChannelIndex < 0) {
            return;
        }

        this.selectedChannelIndex.set(selectedChannelIndex);
    }

    public setNowPlayingChannel(): void {
        if (this.selectedChannelIndex() !== this.nowPlayingChannelIndex()) {
            this.previousChannelIndex = this.nowPlayingChannelIndex();
        }

        this.nowPlaying.set(undefined);
        this.nowPlayingChannelIndex.set(this.selectedChannelIndex());

        // A radio station takes over from Spotify: let go of the phone, like a Bluetooth speaker
        // that's switched off, so the two never play at the same time
        if (!this.isSpotify() && this.spotify.state().active) {
            this.spotify.disconnect();
        }

        this.startRadio();
        this.getNowPlaying();
    }

    public playChannel(index: number): void {
        this.setSelectedChannel(index);
        this.setNowPlayingChannel();
    }

    // Channel up and down, round the list
    public stepChannel(step: number): void {
        const count = this.radioChannels.length;

        this.playChannel((this.nowPlayingChannelIndex() + step + count) % count);
    }

    // Back and forth between the last two stations, like the previous channel button on a TV
    public playPreviousChannel(): void {
        if (this.previousChannelIndex !== undefined) {
            this.playChannel(this.previousChannelIndex);
        }
    }

    // Stations are numbered from 1. A digit that can't start a longer number switches right away
    // (with 14 stations: 2 to 9, or 1 then 4); otherwise the TV waits a moment for the next one.
    public typeDigit(digit: Digit): void {
        clearTimeout(this.typingTimer);

        const count = this.radioChannels.length;
        let typed = this.typedNumber() + digit;

        // Past the last station, the new digit starts a new number
        if (Number(typed) > count) typed = digit;

        if (Number(typed) < 1) {
            this.typedNumber.set('');
            return;
        }

        this.typedNumber.set(typed);

        if (Number(typed) * 10 > count) {
            this.playTypedChannel();
        } else {
            this.typingTimer = setTimeout(() => this.playTypedChannel(), NEXT_DIGIT_WAIT);
        }
    }

    private playTypedChannel(): void {
        const index = Number(this.typedNumber()) - 1;

        this.typedNumber.set('');
        this.playChannel(index);
    }

    public listenForKeyDown(): void {
        this.keyDownSubject()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((key: KeyboardEventKey) => {
                // Straight to a station, with or without the channel list open
                if (isDigit(key)) this.typeDigit(key);
                if (key === 'PageUp') this.stepChannel(1);
                if (key === 'PageDown') this.stepChannel(-1);
                if (key === YELLOW) this.playPreviousChannel();

                if (!this.overlay()) {
                    return;
                }

                if (key === 'Enter') {
                    this.setNowPlayingChannel();
                }

                if (key === 'Backspace') {
                    this.setSelectedChannel(this.nowPlayingChannelIndex());
                }

                if (key === 'ArrowUp') {
                    this.setSelectedChannel(this.selectedChannelIndex() - 1);
                }

                if (key === 'ArrowDown') {
                    this.setSelectedChannel(this.selectedChannelIndex() + 1);
                }
            });
    }

    public ngOnInit(): void {
        this.listenForKeyDown();

        this.power
            .poll(1000 * 30) // 30 seconds
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.getNowPlaying());
    }
}
