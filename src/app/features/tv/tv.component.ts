import { startWith, Subject, switchMap, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isDigit, KeyboardEventKey } from '@data/models/keyboard-event-key.type';
import {
    afterNextRender,
    Component,
    DestroyRef,
    inject,
    OnInit,
    signal,
    viewChild,
} from '@angular/core';
import { PowerStore } from '@data/stores/power.store';
import { RadioStore } from '@data/stores/radio.store';
import { SpotifyStore } from '@data/stores/spotify.store';
import { TvService } from '@data/services/tv.service';
import { TvAmbientComponent } from '@features/tv/components/tv-ambient/tv-ambient.component';
import { TvChannelsComponent } from '@features/tv/components/tv-channels/tv-channels.component';
import { TvNowPlayingComponent } from '@features/tv/components/tv-now-playing/tv-now-playing.component';
import { TvSkyComponent } from '@features/tv/components/tv-sky/tv-sky.component';
import { TvWasteComponent } from '@features/tv/components/tv-waste/tv-waste.component';
import { TvPiAlertComponent } from '@features/tv/components/tv-pi-alert/tv-pi-alert.component';
import { TvClockComponent } from '@features/tv/components/tv-clock/tv-clock.component';
import { TvWeatherComponent } from '@features/tv/components/tv-weather/tv-weather.component';
import { TvWallpaperComponent } from '@features/tv/components/tv-wallpaper/tv-wallpaper.component';

// Without a key press for this long, the dashboard gives way to the ambient screen
const IDLE_AFTER = 1000 * 60 * 10; // 10 minutes

// Numbers and channel up and down say exactly what they want, so they act on the first press, even
// on the idle screen. Other keys only wake the dashboard first: OK is the button people press to
// wake it, and shouldn't pause the music while doing so.
const isDirect = (key: KeyboardEventKey): boolean =>
    isDigit(key) || key === 'PageUp' || key === 'PageDown';

@Component({
    selector: 'app-tv',
    templateUrl: './tv.component.html',
    styleUrl: './tv.component.scss',
    imports: [
        TvNowPlayingComponent,
        TvChannelsComponent,
        TvPiAlertComponent,
        TvClockComponent,
        TvSkyComponent,
        TvWasteComponent,
        TvWeatherComponent,
        TvWallpaperComponent,
        TvAmbientComponent,
    ],
    host: {
        '(window:keydown)': 'onKeyDown($event)',
        '(document:pointerdown)': 'radio.startIfBlocked()',
    },
})
export class TvComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly activity = new Subject<void>();
    private readonly power = inject(PowerStore);
    private readonly spotify = inject(SpotifyStore);
    private readonly tv = inject(TvService);
    private readonly channels = viewChild(TvChannelsComponent);

    public readonly radio = inject(RadioStore);
    public readonly overlay = signal(false);
    public readonly idle = signal(false);

    constructor() {
        afterNextRender(() => this.radio.start());
    }

    public goIdle(): void {
        this.overlay.set(false);
        this.idle.set(true);
    }

    // Any key wakes the dashboard, but only wakes it: the first press doesn't also open the
    // channel list or go straight back to idle, unless it's a direct key (see isDirect). F13 comes
    // from the TV (see pi/hdmicec.sh) and only wakes.
    public onKeyDown(event: KeyboardEvent): void {
        const key = event.key as KeyboardEventKey;
        const wasIdle = this.idle();

        // F14 comes from the TV too: it turned off or switched away, so nobody's watching
        if (key === 'F14') {
            this.power.sleep();
            this.goIdle();
            return;
        }

        this.radio.startIfBlocked();
        this.power.wake();
        this.activity.next();

        if (key === 'F13' || (wasIdle && !isDirect(key))) {
            return;
        }

        // Straight to a station, with or without the channel list open
        if (isDigit(key)) return this.radio.typeDigit(key);
        if (key === 'PageUp') return this.radio.step(1);
        if (key === 'PageDown') return this.radio.step(-1);

        if (this.overlay()) {
            this.channels()?.onKey(key);
            return;
        }

        switch (key) {
            // Like a music app: OK pauses and plays. On Spotify with nothing loaded there's nothing
            // to pause, so it opens the list to pick something.
            case 'Enter':
                if (this.radio.isSpotify() && !this.spotify.state().active) {
                    this.overlay.set(true);
                } else {
                    this.radio.playPause();
                }
                break;
            case 'ArrowUp':
            case 'ArrowDown':
                this.overlay.set(true);
                break;
            case 'Backspace':
                this.goIdle();
                break;
            // Spotify's songs, like left and right on a TV's music app
            case 'ArrowLeft':
                if (this.radio.isSpotify()) this.spotify.previous();
                break;
            case 'ArrowRight':
                if (this.radio.isSpotify()) this.spotify.next();
                break;
        }
    }

    public listenForActivity(): void {
        this.activity
            .pipe(
                startWith(undefined),
                switchMap(() => {
                    this.idle.set(false);
                    return timer(IDLE_AFTER);
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => this.goIdle());
    }

    public ngOnInit(): void {
        this.listenForActivity();

        // Starting while the TV is off, like after a reboot: go straight to sleep
        this.tv
            .getState()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((state) => {
                if (state === 'off') {
                    this.power.sleep();
                    this.goIdle();
                }
            });
    }
}
