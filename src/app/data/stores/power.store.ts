import { EMPTY, Observable, switchMap, timer } from 'rxjs';
import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

// Asleep while the TV is off or showing another input (see pi/hdmicec.sh): nobody can see or
// hear the Pi then, so it stops the stream and all polling. Chromium keeps running, so waking up
// is instant.
@Injectable({ providedIn: 'root' })
export class PowerStore {
    public readonly awake = signal(true);
    public readonly awake$ = toObservable(this.awake);

    private asleepSince = 0;

    public sleep(): void {
        if (this.awake()) this.asleepSince = Date.now();
        this.awake.set(false);
    }

    public wake(): void {
        this.awake.set(true);
    }

    // In milliseconds, 0 while awake
    public asleepFor(): number {
        return this.awake() ? 0 : Date.now() - this.asleepSince;
    }

    // Emits right away and then every period while awake, and pauses while asleep. On waking it
    // emits right away again, so everything is fresh the moment the TV turns on.
    public poll(period: number): Observable<number> {
        return this.awake$.pipe(switchMap((awake) => (awake ? timer(0, period) : EMPTY)));
    }
}
