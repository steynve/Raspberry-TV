import { OpenMeteoForecastHourly } from '@data/models/openmeteo-forecast-hourly.model';

export type TrailCondition = 'dry' | 'wet' | 'muddy';

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
