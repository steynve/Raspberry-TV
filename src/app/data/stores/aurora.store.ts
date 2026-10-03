import { PowerStore } from './power.store';
import { catchError, EMPTY, switchMap } from 'rxjs';
import { Injectable, inject, signal } from '@angular/core';
import { NoaaService } from '@data/services/noaa.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KpBlock } from '@data/models/kp-forecast.model';

const REFRESH = 1000 * 60 * 30; // 30 minutes, NOAA updates the forecast a few times a day

@Injectable({ providedIn: 'root' })
export class AuroraStore {
    private readonly noaaService = inject(NoaaService);
    private readonly power = inject(PowerStore);

    public readonly forecast = signal<KpBlock[] | undefined>(undefined);

    constructor() {
        this.power
            .poll(REFRESH)
            .pipe(
                switchMap(() => this.noaaService.getKpForecast().pipe(catchError(() => EMPTY))),
                takeUntilDestroyed(),
            )
            .subscribe((forecast) => this.forecast.set(forecast));
    }
}
