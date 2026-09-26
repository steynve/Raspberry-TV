import { interval } from 'rxjs';
import { Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const minuteOf = (date: Date): number => Math.floor(date.getTime() / (1000 * 60));

// The current time, updated once a minute (checked every second, so it flips right on time).
// Everything time-based reads from here, so the Pi only re-renders when a minute passes.
@Injectable({ providedIn: 'root' })
export class ClockStore {
    public readonly now = signal(new Date());

    constructor() {
        interval(1000)
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                const now = new Date();

                if (minuteOf(now) !== minuteOf(this.now())) {
                    this.now.set(now);
                }
            });
    }
}
