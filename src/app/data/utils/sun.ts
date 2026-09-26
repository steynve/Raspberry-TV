import { OpenMeteoForecastDaily } from '@data/models/openmeteo-forecast-daily.model';

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

export const sunState = (daily: OpenMeteoForecastDaily, now: Date): SunState => {
    const time = now.getTime();
    const beforeSunrise = time < daily.sunriseTodayTimestamp;
    const afterSunset = time >= daily.sunsetTodayTimestamp;
    const daylightLeft =
        beforeSunrise || afterSunset
            ? 0
            : Math.round((daily.sunsetTodayTimestamp - time) / (1000 * 60));

    return {
        phase:
            beforeSunrise || afterSunset
                ? 'night'
                : daylightLeft <= GOLDEN_HOUR
                  ? 'golden-hour'
                  : 'day',
        sunset: daily.sunsetToday,
        nextSunrise: beforeSunrise ? daily.sunriseToday : daily.sunriseTomorrow,
        daylightLeft,
        night: beforeSunrise
            ? { start: now, end: new Date(daily.sunriseTodayTimestamp) }
            : {
                  start: new Date(Math.max(time, daily.sunsetTodayTimestamp)),
                  end: new Date(daily.sunriseTomorrowTimestamp),
              },
    };
};
