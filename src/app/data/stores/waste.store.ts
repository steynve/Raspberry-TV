import { PowerStore } from './power.store';
import { ClockStore } from './clock.store';
import { catchError, EMPTY, switchMap } from 'rxjs';
import { environment } from '@environments/environment';
import { wasteReminders, weekdayNumbers } from '@data/utils/waste';
import { WastePickup } from '@data/models/waste.model';
import { WasteService } from '@data/services/waste.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { computed, inject, Injectable, signal } from '@angular/core';

// The schedule changes a few times a year, and the TV coming on checks it right away
const REFRESH = 1000 * 60 * 60 * 6; // 6 hours

// Which bins go out, from Area's calendar (see WasteService)
@Injectable({ providedIn: 'root' })
export class WasteStore {
    private readonly clock = inject(ClockStore);

    // Keeps the last schedule when a request fails
    public readonly pickups = signal<WastePickup[]>([]);

    // The evenings nobody's home to put the bins out, from the environment
    private readonly awayEvenings = weekdayNumbers(environment.waste_away_evenings ?? []);

    public readonly reminders = computed(() =>
        wasteReminders(this.pickups(), this.clock.now(), this.awayEvenings),
    );

    constructor() {
        const wasteService = inject(WasteService);

        inject(PowerStore)
            .poll(REFRESH)
            .pipe(
                switchMap(() => wasteService.getPickups().pipe(catchError(() => EMPTY))),
                takeUntilDestroyed(),
            )
            .subscribe((pickups) => this.pickups.set(pickups));
    }
}
