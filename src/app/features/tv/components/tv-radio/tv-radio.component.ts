import { distinctUntilChanged, skip, Subject } from 'rxjs';
import { DNB } from '@data/models/dnb.model';
import { Kink } from '@data/models/kink.model';
import { Flux } from '@data/models/flux.model';
import { RadioService } from '@data/services/radio.service';
import { PowerStore } from '@data/stores/power.store';
import { SpotifyStore } from '@data/stores/spotify.store';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { KeyboardEventKey } from '@data/models/keyboard-event-key.type';
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
    public readonly nowPlaying = signal<Kink | Flux | DNB | undefined>(undefined);
    public readonly nowPlayingChannelIndex = signal(0);
    public readonly selectedChannelIndex = signal(0);
    public readonly playing = signal(false);
    // The kiosk allows autoplay, but a regular browser only plays audio after a key press or click
    public readonly blocked = signal(false);
    public readonly history = signal<PlayedSong[]>([]);
    private current: PlayedSong | undefined;

    public readonly nowPlayingChannel = computed(
        () => this.radioChannels[this.nowPlayingChannelIndex()],
    );

    public readonly spotifyChannelIndex = this.radioChannels.findIndex(
        (channel) => channel.apiSrc === 'SPOTIFY',
    );

    public readonly isSpotify = computed(() => this.nowPlayingChannel().apiSrc === 'SPOTIFY');

    // The playing indicator: the stream on this page, or Spotify on the Pi
    public readonly isPlaying = computed(() =>
        this.isSpotify() ? !!this.spotify.state()?.playing : this.playing(),
    );

    public readonly nowPlayingSong = computed(() => {
        if (this.isSpotify()) {
            const state = this.spotify.state();
            return state?.active ? state.title : '';
        }

        const nowPlaying = this.nowPlaying();

        if (nowPlaying instanceof Kink) {
            return nowPlaying.extended[this.nowPlayingChannel().apiRef].title;
        }

        if (nowPlaying instanceof Flux) {
            return nowPlaying.trackInfo.title;
        }

        if (nowPlaying instanceof DNB) {
            return nowPlaying.title;
        }

        return '';
    });

    public readonly nowPlayingArtist = computed(() => {
        if (this.isSpotify()) {
            const state = this.spotify.state();
            return state?.active ? state.artist : '';
        }

        const nowPlaying = this.nowPlaying();

        if (nowPlaying instanceof Kink) {
            return nowPlaying.extended[this.nowPlayingChannel().apiRef].artist;
        }

        if (nowPlaying instanceof Flux) {
            return nowPlaying.trackInfo.artistCredits;
        }

        if (nowPlaying instanceof DNB) {
            return nowPlaying.artist;
        }

        return '';
    });

    constructor() {
        afterNextRender(() => this.startRadio());

        // Nobody hears HDMI audio while the TV is off or on another input: drop the stream then,
        // and pick it up again when the TV comes back
        this.power.awake$
            .pipe(distinctUntilChanged(), skip(1), takeUntilDestroyed())
            .subscribe((awake) => (awake ? this.startRadio() : this.stopRadio()));

        // Casting from the Spotify app takes over from the radio, like switching to a channel
        toObservable(this.spotify.state)
            .pipe(takeUntilDestroyed())
            .subscribe((state) => {
                if (state?.playing && !this.isSpotify()) {
                    this.nowPlaying.set(undefined);
                    this.nowPlayingChannelIndex.set(this.spotifyChannelIndex);
                    this.selectedChannelIndex.set(this.spotifyChannelIndex);
                    this.stopRadio();
                }

                this.recordSong();
            });
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
            .pipe(takeUntilDestroyed(this.destroyRef))
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
        this.nowPlaying.set(undefined);
        this.nowPlayingChannelIndex.set(this.selectedChannelIndex());

        // A radio station takes over from Spotify, so they never play at the same time
        if (!this.isSpotify() && this.spotify.state()?.playing) {
            this.spotify.pause();
        }

        this.startRadio();
        this.getNowPlaying();
    }

    public listenForKeyDown(): void {
        this.keyDownSubject()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((key: KeyboardEventKey) => {
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
