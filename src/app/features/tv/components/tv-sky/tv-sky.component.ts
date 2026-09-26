import { formatDuration } from '@data/utils/time';
import { ClockStore } from '@data/stores/clock.store';
import { moonPath, moonPhase } from '@data/utils/moon';
import { Component, computed, inject } from '@angular/core';
import { WeatherStore } from '@data/stores/weather.store';
import { averageCloudCover } from '@data/utils/outdoors';
import { AuroraStore } from '@data/stores/aurora.store';
import { auroraChance, maxKp } from '@data/utils/aurora';
import { IconComponent } from '@shared/components/icon/icon.component';

const nightSky = (cloudCover: number | undefined): string | undefined => {
    if (cloudCover === undefined) return undefined;

    return cloudCover < 25
        ? 'clear night'
        : cloudCover < 70
          ? 'partly cloudy night'
          : 'cloudy night';
};

// One line under the clock: daylight during the day, the moon and the night sky after dark
@Component({
    selector: 'app-tv-sky',
    templateUrl: './tv-sky.component.html',
    styleUrl: './tv-sky.component.scss',
    imports: [IconComponent],
})
export class TvSkyComponent {
    private readonly clock = inject(ClockStore);
    private readonly weatherStore = inject(WeatherStore);
    private readonly auroraStore = inject(AuroraStore);

    public readonly sun = this.weatherStore.sun;
    public readonly moon = computed(() => moonPhase(this.clock.now()));
    public readonly moonPath = computed(() => moonPath(this.moon().phase));

    // For the night we are in, or the coming one during the day
    public readonly aurora = computed(() => {
        const sun = this.sun();
        const forecast = this.auroraStore.forecast();

        if (!sun || !forecast) return undefined;

        return auroraChance(maxKp(forecast, sun.night.start, sun.night.end), sun.phase !== 'night');
    });

    public readonly text = computed(() => {
        const sun = this.sun();
        const forecast = this.weatherStore.forecast();

        if (!sun || !forecast) return '';

        if (sun.phase === 'day') {
            return `${formatDuration(sun.daylightLeft)} of daylight left · sunset ${sun.sunset}`;
        }

        if (sun.phase === 'golden-hour') {
            return `Golden hour · sunset ${sun.sunset}, in ${formatDuration(sun.daylightLeft)}`;
        }

        const moon = this.moon();
        const sky = nightSky(averageCloudCover(forecast.hourly, sun.night.start, sun.night.end));

        return [
            `${moon.name} ${Math.round(moon.illumination * 100)}%`,
            sky,
            `sunrise ${sun.nextSunrise}`,
        ]
            .filter(Boolean)
            .join(' · ');
    });
}
