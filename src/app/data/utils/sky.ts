import { getMoonIllumination, getMoonPosition, getPosition } from 'suncalc';
import { OpenMeteoForecastDaily, OpenMeteoForecastHourly } from '@data/models/openmeteo.model';

const MINUTE = 1000 * 60;
const HALF_HOUR = MINUTE * 30;

export interface Location {
    lat: number;
    lon: number;
}

// Dark enough for stars: the sun 12° below the horizon (the end of nautical twilight; in June it
// never gets darker here), clouds under a quarter, and the moon down or too thin to wash out the sky
const DARK_SUN = -12; // degrees, like everything in suncalc
const CLEAR = 25; // % cloud cover
const THIN_MOON = 0.3; // lit fraction
// One clear hour in a forecast is too thin to promise
const SHORTEST_LOOK = MINUTE * 90;

// The longest stretch of dark, clear sky in the night, if it's at least an hour and a half. Cloud cover is
// at the moment of its hour, so each hour stands for the half hour on either side.
export const stargazingWindow = (
    hourly: OpenMeteoForecastHourly,
    night: { start: Date; end: Date },
    { lat, lon }: Location,
): { start: Date; end: Date } | undefined => {
    const from = night.start.getTime();
    const to = night.end.getTime();
    let best: { start: number; end: number } | undefined;
    let run: { start: number; end: number } | undefined;

    hourly.time.forEach((time, index) => {
        const date = new Date(time);
        const middle = date.getTime();

        if (middle + HALF_HOUR <= from || middle - HALF_HOUR >= to) return;

        const moonOut =
            getMoonPosition(date, lat, lon).altitude > 0 &&
            getMoonIllumination(date).fraction >= THIN_MOON;
        const good =
            hourly.cloud_cover[index] < CLEAR &&
            getPosition(date, lat, lon).altitude < DARK_SUN &&
            !moonOut;

        if (!good) {
            run = undefined;
            return;
        }

        run = {
            start: run?.start ?? Math.max(middle - HALF_HOUR, from),
            end: Math.min(middle + HALF_HOUR, to),
        };

        if (!best || run.end - run.start > best.end - best.start) {
            best = { ...run };
        }
    });

    return best && best.end - best.start >= SHORTEST_LOOK
        ? { start: new Date(best.start), end: new Date(best.end) }
        : undefined;
};

export type SunsetColour = 'vivid' | 'some';

// A rule of thumb, like photographers use: mid and high clouds catch the light after the sun has
// set, as long as low clouds and rain don't block it on the horizon. Too few and there's nothing
// to light up, too many and the light can't get through.
export const sunsetColour = (
    hourly: OpenMeteoForecastHourly,
    sunset: Date,
): SunsetColour | undefined => {
    const index = hourly.time.reduce(
        (closest, time, candidate) =>
            Math.abs(new Date(time).getTime() - sunset.getTime()) <
            Math.abs(new Date(hourly.time[closest]).getTime() - sunset.getTime())
                ? candidate
                : closest,
        0,
    );

    if (
        !hourly.time.length ||
        Math.abs(new Date(hourly.time[index]).getTime() - sunset.getTime()) > HALF_HOUR
    ) {
        return undefined;
    }

    // The rain value is for the hour before its time, so look at the next hour too
    const rain = Math.max(hourly.precipitation[index] ?? 0, hourly.precipitation[index + 1] ?? 0);
    const low = hourly.cloud_cover_low[index];
    const upper = Math.max(hourly.cloud_cover_mid[index], hourly.cloud_cover_high[index]);

    if (rain >= 0.1) return undefined;
    if (low < 30 && upper >= 30 && upper <= 75) return 'vivid';
    if (low < 50 && upper >= 15 && upper <= 90) return 'some';

    return undefined;
};

// Minutes of daylight tomorrow compared to today: positive from late December to late June
export const daylightChange = (daily: OpenMeteoForecastDaily): number => {
    const length = (day: number): number =>
        new Date(daily.sunset[day]).getTime() - new Date(daily.sunrise[day]).getTime();

    return (length(1) - length(0)) / MINUTE;
};
