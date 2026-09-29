import { map, merge, startWith, Subject, switchMap, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    BLUE,
    GREEN,
    isDigit,
    KeyboardEventKey,
    RED,
    YELLOW,
} from '@data/models/keyboard-event-key.type';
import { Component, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { PowerStore } from '@data/stores/power.store';
import { SpotifyStore } from '@data/stores/spotify.store';
import { TvService } from '@data/services/tv.service';
import { ThemeStore } from '@data/stores/theme.store';
import { TvThemeSwitcherComponent } from '@features/tv/components/tv-theme-switcher/tv-theme-switcher.component';
import { TvAmbientComponent } from '@features/tv/components/tv-ambient/tv-ambient.component';
import { TvRadioComponent } from '@features/tv/components/tv-radio/tv-radio.component';
import { TvSkyComponent } from '@features/tv/components/tv-sky/tv-sky.component';
import { TvPiAlertComponent } from '@features/tv/components/tv-pi-alert/tv-pi-alert.component';
import { TvClockComponent } from '@features/tv/components/tv-clock/tv-clock.component';
import { TvWeatherComponent } from '@features/tv/components/tv-weather/tv-weather.component';
import { TvWallpaperComponent } from '@features/tv/components/tv-wallpaper/tv-wallpaper.component';

// Without a key press for this long, the dashboard gives way to the ambient screen
const IDLE_AFTER = 1000 * 60 * 10; // 10 minutes

// How long the theme options show after a colour button
const SHOW_THEMES = 2500;

// Numbers, channel up and down and the colour buttons say exactly what they want, so they act
// on the first press, even on the idle screen. Other keys only wake the dashboard first.
const isDirect = (key: KeyboardEventKey): boolean =>
    isDigit(key) || [RED, GREEN, YELLOW, BLUE, 'PageUp', 'PageDown'].includes(key);

@Component({
    selector: 'app-tv',
    templateUrl: './tv.component.html',
    styleUrl: './tv.component.scss',
    imports: [
        TvRadioComponent,
        TvPiAlertComponent,
        TvClockComponent,
        TvSkyComponent,
        TvWeatherComponent,
        TvWallpaperComponent,
        TvAmbientComponent,
        TvThemeSwitcherComponent,
    ],
    host: {
        '(window:keydown)': 'onKeyDown($event)',
    },
})
export class TvComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly activity = new Subject<void>();
    private readonly power = inject(PowerStore);
    private readonly spotify = inject(SpotifyStore);
    private readonly tv = inject(TvService);
    private readonly themes = inject(ThemeStore);
    private readonly themePicked = new Subject<void>();

    public readonly radio = viewChild(TvRadioComponent);
    public readonly keyDownSubject = new Subject<KeyboardEventKey>();
    public readonly overlay = signal(false);
    public readonly idle = signal(false);
    public readonly showThemes = signal(false);

    // Back closes the channel list, or else goes to the idle screen right away
    public back(): void {
        if (this.overlay()) {
            this.toggleOverlayVisibility();
            return;
        }
        this.goIdle();
    }

    public goIdle(): void {
        this.overlay.set(false);
        this.idle.set(true);
    }

    public toggleOverlayVisibility(): void {
        this.overlay.update((overlay) => !overlay);
    }

    // Any key wakes the dashboard, but only wakes it: the first press doesn't also open the
    // channel list or go straight back to idle, unless it's a direct key (see isDirect). F13 comes
    // from the TV (see pi/hdmicec.sh) and only wakes.
    public onKeyDown(event: KeyboardEvent): void {
        const key = event.key as KeyboardEventKey;
        const wasIdle = this.idle();

        // F15 comes from the Pi: Spotify changed. Not a person, so it doesn't wake anything.
        if (key === 'F15') {
            this.spotify.refresh();
            return;
        }

        // F14 comes from the TV too: it turned off or switched away, so nobody's watching
        if (key === 'F14') {
            this.power.sleep();
            this.goIdle();
            return;
        }

        this.power.wake();
        this.activity.next();

        if (key === 'F13' || (wasIdle && !isDirect(key))) {
            return;
        }

        this.keyDownSubject.next(key);
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

    public listenForKeyDown(): void {
        this.keyDownSubject
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((key: KeyboardEventKey) => {
                if (key === 'Backspace') {
                    this.back();
                }

                if (key === 'Enter') {
                    this.toggleOverlayVisibility();
                }

                const theme = this.themes.themeFor(key);

                if (theme) {
                    this.themes.theme.set(theme);
                    this.themePicked.next();
                }
            });
    }

    // Every colour button shows the options again, for a moment
    public listenForThemes(): void {
        this.themePicked
            .pipe(
                switchMap(() =>
                    merge(
                        timer(0).pipe(map(() => true)),
                        timer(SHOW_THEMES).pipe(map(() => false)),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((show) => this.showThemes.set(show));
    }

    public ngOnInit(): void {
        this.listenForKeyDown();
        this.listenForActivity();
        this.listenForThemes();

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
