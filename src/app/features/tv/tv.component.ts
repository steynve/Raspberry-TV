import { startWith, Subject, switchMap, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KeyboardEventKey } from '@data/models/keyboard-event-key.type';
import { Component, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { PowerStore } from '@data/stores/power.store';
import { TvAmbientComponent } from '@features/tv/components/tv-ambient/tv-ambient.component';
import { TvRadioComponent } from '@features/tv/components/tv-radio/tv-radio.component';
import { TvSkyComponent } from '@features/tv/components/tv-sky/tv-sky.component';
import { TvPiAlertComponent } from '@features/tv/components/tv-pi-alert/tv-pi-alert.component';
import { TvClockComponent } from '@features/tv/components/tv-clock/tv-clock.component';
import { TvWeatherComponent } from '@features/tv/components/tv-weather/tv-weather.component';
import { TvWallpaperComponent } from '@features/tv/components/tv-wallpaper/tv-wallpaper.component';

// Without a key press for this long, the dashboard gives way to the ambient screen
const IDLE_AFTER = 1000 * 60 * 10; // 10 minutes

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
    ],
    host: {
        '(window:keydown)': 'onKeyDown($event)',
    },
})
export class TvComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly activity = new Subject<void>();
    private readonly power = inject(PowerStore);

    public readonly radio = viewChild(TvRadioComponent);
    public readonly keyDownSubject = new Subject<KeyboardEventKey>();
    public readonly overlay = signal(false);
    public readonly idle = signal(false);

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
    // channel list or go straight back to idle. F13 comes from the TV (see pi/hdmicec.sh) and only
    // wakes.
    public onKeyDown(event: KeyboardEvent): void {
        const key = event.key as KeyboardEventKey;
        const wasIdle = this.idle();

        // F14 comes from the TV too: it turned off or switched away, so nobody's watching
        if (key === 'F14') {
            this.power.sleep();
            this.goIdle();
            return;
        }

        this.power.wake();
        this.activity.next();

        if (!wasIdle && key !== 'F13') {
            this.keyDownSubject.next(key);
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
            });
    }

    public ngOnInit(): void {
        this.listenForKeyDown();
        this.listenForActivity();
    }
}
