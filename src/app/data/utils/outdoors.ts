import { OpenMeteoForecastDaily } from '@data/models/openmeteo-forecast-daily.model';
import { OpenMeteoForecastHourly } from '@data/models/openmeteo-forecast-hourly.model';

export type TrailCondition = 'dry' | 'wet' | 'muddy';

export interface RideOutlook {
    // After sunset, the outlook is for tomorrow's daylight
    tomorrow: boolean;
    // The longest good stretch, if there is one long enough for a ride
    window?: { start: Date; end: Date; untilDark: boolean };
}

const HOUR = 1000 * 60 * 60;
const SHORTEST_RIDE = 1000 * 60 * 90; // 1.5 hours

// Good to ride: no rain worth mentioning, and no gusts strong enough to bring down branches
const isRideable = (hourly: OpenMeteoForecastHourly, index: number): boolean =>
    (hourly.precipitation[index] ?? 0) < 0.1 &&
    (hourly.precipitation_probability[index] ?? 0) < 35 &&
    (hourly.wind_gusts_10m[index] ?? 0) < 50;

const hoursUntil = (hourly: OpenMeteoForecastHourly, now: Date): number[] =>
    hourly.time.flatMap((time, index) => (new Date(time) <= now ? [index] : []));

// A simple water balance over the last 48 hours: rain fills the trail, evaporation dries it.
// It never goes below empty, so a hot day can't "save up" dryness for the next shower.
export const trailCondition = (hourly: OpenMeteoForecastHourly, now: Date): TrailCondition => {
    const water = hoursUntil(hourly, now).reduce(
        (total, index) =>
            Math.max(
                0,
                total +
                    (hourly.precipitation[index] ?? 0) -
                    (hourly.et0_fao_evapotranspiration[index] ?? 0),
            ),
        0,
    );

    return water >= 4 ? 'muddy' : water >= 1 ? 'wet' : 'dry';
};

export const currentGusts = (hourly: OpenMeteoForecastHourly, now: Date): number | undefined => {
    const past = hoursUntil(hourly, now);

    return past.length ? hourly.wind_gusts_10m[past[past.length - 1]] : undefined;
};

export const averageCloudCover = (
    hourly: OpenMeteoForecastHourly,
    start: Date,
    end: Date,
): number | undefined => {
    const hourStart = new Date(start);
    hourStart.setMinutes(0, 0, 0);

    const values = hourly.time.flatMap((time, index) => {
        const date = new Date(time);

        return date >= hourStart && date < end ? [hourly.cloud_cover[index]] : [];
    });

    return values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : undefined;
};

// The best time to ride in what's left of today's daylight, or tomorrow's after sunset
export const rideOutlook = (
    hourly: OpenMeteoForecastHourly,
    daily: OpenMeteoForecastDaily,
    now: Date,
): RideOutlook => {
    const tomorrow = now.getTime() >= daily.sunsetTodayTimestamp;
    const light = tomorrow
        ? new Date(daily.sunrise[1]).getTime()
        : Math.max(now.getTime(), daily.sunriseTodayTimestamp);
    const dark = tomorrow ? new Date(daily.sunset[1]).getTime() : daily.sunsetTodayTimestamp;

    let best: { start: number; end: number } | undefined;
    let run: { start: number; end: number } | undefined;

    hourly.time.forEach((time, index) => {
        // Each value is for the hour before its time
        const end = new Date(time).getTime();
        const start = end - HOUR;

        if (end <= light || start >= dark) return;

        if (!isRideable(hourly, index)) {
            run = undefined;
            return;
        }

        run = { start: run?.start ?? Math.max(start, light), end: Math.min(end, dark) };

        if (!best || run.end - run.start > best.end - best.start) {
            best = { ...run };
        }
    });

    return best && best.end - best.start >= SHORTEST_RIDE
        ? {
              tomorrow,
              window: {
                  start: new Date(best.start),
                  end: new Date(best.end),
                  untilDark: best.end === dark,
              },
          }
        : { tomorrow };
};
