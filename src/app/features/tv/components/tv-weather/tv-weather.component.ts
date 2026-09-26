import { forkJoin, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WEATHER_ICON_MAP } from '@data/constants/weather-icons';
import { OpenMeteoService } from '@data/services/openmeteo.service';
import { OpenMeteoForecast } from '@data/models/openmeteo-forecast.model';
import { OpenMeteoAirQuality } from '@data/models/openmeteo-airquality.model';
import { OpenMeteoAirqualityService } from '@data/services/openmeteo-airquality.service';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';

type PollenType =
    | 'alder_pollen'
    | 'birch_pollen'
    | 'olive_pollen'
    | 'grass_pollen'
    | 'mugwort_pollen'
    | 'ragweed_pollen';

type PollenGroup = 'tree' | 'grass' | 'weed';

@Component({
    selector: 'app-tv-weather',
    templateUrl: './tv-weather.component.html',
    styleUrl: './tv-weather.component.scss',
})
export class TvWeatherComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly openMeteoService = inject(OpenMeteoService);
    private readonly openMeteoAirqualityService = inject(OpenMeteoAirqualityService);

    public readonly forecast = signal<OpenMeteoForecast | undefined>(undefined);
    public readonly airQuality = signal<OpenMeteoAirQuality | undefined>(undefined);
    public readonly sun = signal<{ time?: string; type?: 'sunrise' | 'sunset' }>({});

    public readonly pollenGroups: Record<PollenGroup, PollenType[]> = {
        tree: ['alder_pollen', 'birch_pollen', 'olive_pollen'],
        grass: ['grass_pollen'],
        weed: ['mugwort_pollen', 'ragweed_pollen'],
    };

    public readonly pollenThresholds: Record<PollenType, number[]> = {
        alder_pollen: [0, 2, 5, 10, 20, 35, 60, 90, 120, 140, 150],
        birch_pollen: [0, 2, 5, 10, 20, 35, 60, 90, 150, 200, 250],
        olive_pollen: [0, 1, 3, 5, 10, 17, 30, 40, 60, 80, 100],
        grass_pollen: [0, 1, 3, 5, 10, 20, 40, 60, 80, 90, 100],
        mugwort_pollen: [0, 0.5, 1, 2, 3, 5, 10, 20, 40, 60, 80],
        ragweed_pollen: [0, 0.2, 0.5, 1, 2, 3, 5, 10, 20, 40, 50],
    };

    public readonly weatherIcon = computed(() => {
        const forecast = this.forecast();

        if (!forecast) return '';

        return WEATHER_ICON_MAP[forecast.current_weather.weathercode][
            forecast.current_weather.is_day ? 'day' : 'night'
        ].image;
    });

    public pollenGroupScore(group: PollenGroup): number {
        const airQuality = this.airQuality();

        if (!airQuality) return 0;

        return Math.max(
            ...this.pollenGroups[group].map((pollenType) => {
                const value = airQuality.current[pollenType];
                const thresholds = this.pollenThresholds[pollenType];

                return value > thresholds[thresholds.length - 1]
                    ? 10
                    : thresholds.findLastIndex((threshold) => value >= threshold);
            }),
        );
    }

    public getWeather(): void {
        forkJoin({
            forecast: this.openMeteoService.getForecast(),
            airQuality: this.openMeteoAirqualityService.getAirQuality(),
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(({ forecast, airQuality }) => {
                this.forecast.set(forecast);
                this.airQuality.set(airQuality);
                this.setSun();
            });
    }

    public ngOnInit(): void {
        this.getWeather();

        interval(1000 * 60 * 5) // 5 minutes
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.getWeather());
    }

    public setSun(): void {
        const forecast = this.forecast();

        if (!forecast) return;

        const now = new Date().getTime();
        const { daily } = forecast;

        if (now <= daily.sunriseTodayTimestamp) {
            this.sun.set({ type: 'sunrise', time: daily.sunriseToday });
            return;
        }

        if (now <= daily.sunsetTodayTimestamp) {
            this.sun.set({ type: 'sunset', time: daily.sunsetToday });
            return;
        }

        this.sun.set({ type: 'sunrise', time: daily.sunriseTomorrow });
    }
}
