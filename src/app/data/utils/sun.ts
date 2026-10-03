import { OpenMeteoForecastDaily } from '@data/models/openmeteo.model';

export type SunPhase = 'day' | 'golden-hour' | 'night';

export interface SunState {
    phase: SunPhase;
    sunset: string;
    nextSunrise: string;
    daylightLeft: number; // minutes, 0 at night
    // The night we are in, or the coming one during the day
    night: { start: Date; end: Date };
}

const GOLDEN_HOUR = 60; // minutes before sunset

// "2026-03-01T07:00" → "07:00"
const clockTime = (time: string): string => time.split('T')[1];

export const sunState = (daily: OpenMeteoForecastDaily, now: Date): SunState => {
    const time = now.getTime();
    const sunrise = new Date(daily.sunrise[0]).getTime();
    const sunset = new Date(daily.sunset[0]).getTime();
    const beforeSunrise = time < sunrise;
    const afterSunset = time >= sunset;
    const daylightLeft =
        beforeSunrise || afterSunset ? 0 : Math.round((sunset - time) / (1000 * 60));

    return {
        phase:
            beforeSunrise || afterSunset
                ? 'night'
                : daylightLeft <= GOLDEN_HOUR
                  ? 'golden-hour'
                  : 'day',
        sunset: clockTime(daily.sunset[0]),
        nextSunrise: clockTime(daily.sunrise[beforeSunrise ? 0 : 1]),
        daylightLeft,
        night: beforeSunrise
            ? { start: now, end: new Date(sunrise) }
            : { start: new Date(Math.max(time, sunset)), end: new Date(daily.sunrise[1]) },
    };
};
