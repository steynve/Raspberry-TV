import { ClockStore } from './clock.store';
import { sunState } from '@data/utils/sun';
import { upcomingRain } from '@data/utils/rain';
import { PowerStore } from './power.store';
import { catchError, EMPTY, forkJoin, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OpenMeteoService } from '@data/services/openmeteo.service';
import { computed, inject, Injectable, signal } from '@angular/core';
import { OpenMeteoAirQuality, OpenMeteoForecast } from '@data/models/openmeteo.model';

const REFRESH = 1000 * 60 * 5; // 5 minutes

// Fetches the weather once for every widget that needs it
@Injectable({ providedIn: 'root' })
export class WeatherStore {
    private readonly clock = inject(ClockStore);
    private readonly power = inject(PowerStore);
    private readonly openMeteoService = inject(OpenMeteoService);

    public readonly forecast = signal<OpenMeteoForecast | undefined>(undefined);
    public readonly airQuality = signal<OpenMeteoAirQuality | undefined>(undefined);

    public readonly rain = computed(() => {
        const forecast = this.forecast();

        return forecast ? upcomingRain(forecast.minutely_15, this.clock.now()) : [];
    });

    public readonly sun = computed(() => {
        const forecast = this.forecast();

        return forecast ? sunState(forecast.daily, this.clock.now()) : undefined;
    });

    constructor() {
        this.power
            .poll(REFRESH)
            .pipe(
                switchMap(() =>
                    forkJoin({
                        forecast: this.openMeteoService.getForecast(),
                        // The pollen is extra: when its API doesn't answer, the weather still shows
                        airQuality: this.openMeteoService
                            .getAirQuality()
                            .pipe(catchError(() => of(undefined))),
                    }).pipe(catchError(() => EMPTY)),
                ),
                takeUntilDestroyed(),
            )
            .subscribe(({ forecast, airQuality }) => {
                this.forecast.set(forecast);

                // A failed request keeps the last pollen count
                if (airQuality) {
                    this.airQuality.set(airQuality);
                }
            });
    }
}
