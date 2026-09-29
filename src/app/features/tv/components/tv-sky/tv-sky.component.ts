import { environment } from '@environments/environment';
import { formatDuration, formatTime } from '@data/utils/time';
import { IconName } from '@shared/components/icon/icon-name.type';
import { daylightChange, stargazingWindow, sunsetColour } from '@data/utils/sky';
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

const HOME = { lat: Number(environment.open_meteo_lat), lon: Number(environment.open_meteo_lon) };

// A window starting within this is "now"
const SOON = 1000 * 60 * 10;

export interface SkyNote {
    kind: 'sunset' | 'daylight' | 'stars';
    icon: IconName;
    text: string;
}

// "Losing 4 min of daylight a day", or around the solstices, when it barely changes, which one
const daylightNote = (minutes: number, now: Date): string => {
    const change = Math.round(Math.abs(minutes));

    if (!change) {
        const month = now.getMonth();

        return month >= 4 && month <= 7 ? 'Longest days of the year' : 'Shortest days of the year';
    }

    return `${minutes > 0 ? 'Gaining' : 'Losing'} ${change} min of daylight a day`;
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

    // A second, quieter line: what's worth going outside for. The sunset while it's still to come,
    // how fast the days change during the day, and a clear, dark sky from the golden hour on.
    public readonly notes = computed((): SkyNote[] => {
        const sun = this.sun();
        const forecast = this.weatherStore.forecast();

        if (!sun || !forecast) return [];

        const now = this.clock.now();
        const notes: SkyNote[] = [];

        if (sun.phase !== 'night') {
            const colour = sunsetColour(
                forecast.hourly,
                new Date(forecast.daily.sunsetTodayTimestamp),
            );

            if (colour) {
                notes.push({
                    kind: 'sunset',
                    icon: 'sunset',
                    text: colour === 'vivid' ? 'Vivid sunset likely' : 'Some colour at sunset',
                });
            }
        }

        if (sun.phase === 'day') {
            notes.push({
                kind: 'daylight',
                icon: 'hourglass',
                text: daylightNote(daylightChange(forecast.daily), now),
            });
        }

        const stars =
            sun.phase === 'day' ? undefined : stargazingWindow(forecast.hourly, sun.night, HOME);

        if (stars) {
            const until = formatTime(stars.end);
            const tonight = sun.phase === 'night' ? '' : 'tonight ';

            notes.push({
                kind: 'stars',
                icon: 'telescope',
                text:
                    sun.phase === 'night' && stars.start.getTime() - now.getTime() < SOON
                        ? `Stargazing until ${until}`
                        : `Stargazing ${tonight}${formatTime(stars.start)}–${until}`,
            });
        }

        return notes;
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
