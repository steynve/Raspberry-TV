import { interval, Subject } from 'rxjs';
import { DNB } from '@data/models/dnb.model';
import { Kink } from '@data/models/kink.model';
import { Flux } from '@data/models/flux.model';
import { RadioService } from '@data/services/radio.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KeyboardEventKey } from '@data/models/keyboard-event-key.type';
import { TvNpmfeedComponent } from '../tv-npmfeed/tv-npmfeed.component';
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

@Component({
    selector: 'app-tv-radio',
    templateUrl: './tv-radio.component.html',
    styleUrl: './tv-radio.component.scss',
    imports: [TvNpmfeedComponent],
})
export class TvRadioComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly radioService = inject(RadioService);
    private readonly radioElement =
        viewChild.required<ElementRef<HTMLAudioElement>>('radioElement');

    public readonly keyDownSubject = input.required<Subject<KeyboardEventKey>>();
    public readonly overlay = input(false);

    public readonly radioChannels = this.radioService.radioChannels;
    public readonly nowPlaying = signal<Kink | Flux | DNB | undefined>(undefined);
    public readonly nowPlayingChannelIndex = signal(0);
    public readonly selectedChannelIndex = signal(0);

    public readonly nowPlayingChannel = computed(
        () => this.radioChannels[this.nowPlayingChannelIndex()],
    );

    public readonly nowPlayingSong = computed(() => {
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
    }

    public startRadio(): void {
        const radio = this.radioElement().nativeElement;

        radio.src = this.nowPlayingChannel().file;
        radio.volume = 0.5;
        radio.play();
    }

    public getNowPlaying(): void {
        this.radioService
            .getNowPlaying(this.nowPlayingChannel())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response) => this.nowPlaying.set(response));
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
        this.getNowPlaying();
        this.listenForKeyDown();

        interval(1000 * 30) // 30 seconds
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.getNowPlaying());
    }
}
