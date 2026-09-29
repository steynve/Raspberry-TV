import { isWet } from '@data/utils/rain';
import { ClockStore } from '@data/stores/clock.store';
import { Component, computed, inject } from '@angular/core';
import { WeatherStore } from '@data/stores/weather.store';
import { TvRainComponent } from '../tv-rain/tv-rain.component';
import { weatherCondition } from '@data/constants/weather-conditions';
import { IconName } from '@shared/components/icon/icon-name.type';
import { IconComponent } from '@shared/components/icon/icon.component';
import { TvForecastComponent } from '../tv-forecast/tv-forecast.component';
import { formatTime } from '@data/utils/time';
import {
    currentGusts,
    RideOutlook,
    rideOutlook,
    TrailCondition,
    trailCondition,
} from '@data/utils/outdoors';

type PollenType =
    | 'alder_pollen'
    | 'birch_pollen'
    | 'olive_pollen'
    | 'grass_pollen'
    | 'mugwort_pollen'
    | 'ragweed_pollen';

type PollenGroup = 'tree' | 'grass' | 'weed';

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const TRAIL_LABELS: Record<TrailCondition, string> = {
    dry: 'Trails dry',
    wet: 'Trails wet',
    muddy: 'Trails muddy',
};

// A window starting within this is "now"
const SOON = 1000 * 60 * 10;

// "Good to ride until dark", "Best to ride 14:00–16:30", "Tomorrow, ride from 10:00 until dark"
const rideLabel = ({ tomorrow, window }: RideOutlook, now: Date): string => {
    if (!window) {
        return tomorrow ? 'No dry spell to ride tomorrow' : 'No dry spell to ride before dark';
    }

    const start = formatTime(window.start);
    const span = window.untilDark
        ? `from ${start} until dark`
        : `${start}–${formatTime(window.end)}`;

    if (tomorrow) {
        return `Tomorrow, ride ${span}`;
    }

    if (window.start.getTime() - now.getTime() < SOON) {
        return window.untilDark
            ? 'Good to ride until dark'
            : `Good to ride until ${formatTime(window.end)}`;
    }

    return `Best to ride ${span}`;
};

@Component({
    selector: 'app-tv-weather',
    templateUrl: './tv-weather.component.html',
    styleUrl: './tv-weather.component.scss',
    imports: [IconComponent, TvRainComponent, TvForecastComponent],
})
export class TvWeatherComponent {
    private readonly clock = inject(ClockStore);
    private readonly weatherStore = inject(WeatherStore);

    public readonly forecast = this.weatherStore.forecast;
    public readonly airQuality = this.weatherStore.airQuality;
    public readonly rain = this.weatherStore.rain;
    public readonly rainExpected = computed(() => this.rain().some(isWet));

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

    public readonly pollenLabels: Record<PollenGroup, { label: string; icon: IconName }> = {
        tree: { label: 'Trees', icon: 'trees' },
        grass: { label: 'Grasses', icon: 'wheat' },
        weed: { label: 'Weeds', icon: 'flower-2' },
    };

    public readonly condition = computed(() => {
        const current = this.forecast()?.current_weather;

        return weatherCondition(current?.weathercode ?? -1, !!current?.is_day);
    });

    public readonly wind = computed(() => {
        const forecast = this.forecast();

        if (!forecast) return '';

        const { winddirection, windspeed } = forecast.current_weather;
        const direction = COMPASS[Math.round(winddirection / 45) % COMPASS.length];
        const gusts = currentGusts(forecast.hourly, this.clock.now());
        const wind = `${direction} ${Math.round(windspeed)} km/h`;

        return gusts === undefined ? wind : `${wind} · gusts ${Math.round(gusts)}`;
    });

    // Only worth mentioning on a bright day: 5 and up means sunscreen
    public readonly uv = computed(() => {
        const uvMax = this.forecast()?.daily.uv_index_max[0];

        return this.weatherStore.sun()?.phase !== 'night' && uvMax !== undefined && uvMax >= 5
            ? Math.round(uvMax)
            : undefined;
    });

    public readonly trail = computed(() => {
        const forecast = this.forecast();

        return forecast ? TRAIL_LABELS[trailCondition(forecast.hourly, this.clock.now())] : '';
    });

    public readonly ride = computed(() => {
        const forecast = this.forecast();
        const now = this.clock.now();

        return forecast ? rideLabel(rideOutlook(forecast.hourly, forecast.daily, now), now) : '';
    });

    public readonly pollen = computed(() =>
        this.airQuality()
            ? (Object.keys(this.pollenGroups) as PollenGroup[]).map((group) => ({
                  group,
                  ...this.pollenLabels[group],
                  score: this.pollenGroupScore(group),
              }))
            : [],
    );

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
}
