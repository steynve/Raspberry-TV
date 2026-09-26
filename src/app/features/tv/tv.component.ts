import { Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KeyboardEventKey } from '@data/models/keyboard-event-key.type';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { TvRadioComponent } from '@features/tv/components/tv-radio/tv-radio.component';
import { TvClockComponent } from '@features/tv/components/tv-clock/tv-clock.component';
import { TvWeatherComponent } from '@features/tv/components/tv-weather/tv-weather.component';
import { TvWallpaperComponent } from '@features/tv/components/tv-wallpaper/tv-wallpaper.component';

@Component({
    selector: 'app-tv',
    templateUrl: './tv.component.html',
    styleUrl: './tv.component.scss',
    imports: [TvRadioComponent, TvClockComponent, TvWeatherComponent, TvWallpaperComponent],
    host: {
        '(window:keydown)': 'onKeyDown($event)',
    },
})
export class TvComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);

    public readonly keyDownSubject = new Subject<KeyboardEventKey>();
    public readonly hidden = signal(false);
    public readonly overlay = signal(false);

    public toggleAppVisibility(): void {
        if (this.overlay()) {
            this.toggleOverlayVisibility();
            return;
        }
        this.hidden.update((hidden) => !hidden);
    }

    public toggleOverlayVisibility(): void {
        this.overlay.update((overlay) => !overlay);
    }

    public onKeyDown(event: KeyboardEvent): void {
        this.keyDownSubject.next(event.key as KeyboardEventKey);
    }

    public listenForKeyDown(): void {
        this.keyDownSubject
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((key: KeyboardEventKey) => {
                if (key === 'Backspace') {
                    this.toggleAppVisibility();
                }

                if (key === 'Enter') {
                    this.toggleOverlayVisibility();
                }
            });
    }

    public ngOnInit(): void {
        this.listenForKeyDown();
    }
}
