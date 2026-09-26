import { ClockStore } from './clock.store';
import { PowerStore } from './power.store';
import { catchError, EMPTY, switchMap } from 'rxjs';
import { PiHealth } from '@data/models/pi-health.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { computed, inject, Injectable, signal } from '@angular/core';
import { PiHealthService } from '@data/services/pi-health.service';
import { piAlerts } from '@data/utils/pi';

const REFRESH = 1000 * 60; // the Pi writes a new measurement every minute

@Injectable({ providedIn: 'root' })
export class PiHealthStore {
    private readonly clock = inject(ClockStore);
    private readonly power = inject(PowerStore);
    private readonly piHealthService = inject(PiHealthService);

    // Keeps the last measurement when a request fails, so a dead script shows up as stale
    public readonly health = signal<PiHealth | undefined>(undefined);

    public readonly alerts = computed(() => {
        const health = this.health();

        return health ? piAlerts(health, this.clock.now()) : [];
    });

    constructor() {
        this.power
            .poll(REFRESH)
            .pipe(
                switchMap(() => this.piHealthService.getHealth().pipe(catchError(() => EMPTY))),
                takeUntilDestroyed(),
            )
            .subscribe((health) => this.health.set(health));
    }
}
