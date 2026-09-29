import { describe, expect, it } from 'vitest';
import { forecastDailyMock } from '@data/services/mocks/openmeteo.mock';
import { OpenMeteoForecastHourly } from '@data/models/openmeteo-forecast-hourly.model';
import { daylightChange, stargazingWindow, sunsetColour } from './sky';

const home = { lat: 52.72, lon: 6.46 };

interface Hour {
    time: string;
    clouds?: number;
    low?: number;
    mid?: number;
    high?: number;
    rain?: number;
}

const hourly = (hours: Hour[]): OpenMeteoForecastHourly =>
    new OpenMeteoForecastHourly(
        hours.map((hour) => hour.time),
        hours.map((hour) => hour.rain ?? 0),
        hours.map(() => 0),
        hours.map((hour) => hour.clouds ?? 0),
        hours.map(() => 0),
        hours.map(() => 0),
        hours.map((hour) => hour.low ?? 0),
        hours.map((hour) => hour.mid ?? 0),
        hours.map((hour) => hour.high ?? 0),
    );

// Every hour from `from` on the given day, into the next morning
const night = (day: string, next: string, clouds: (hour: number) => number): Hour[] =>
    Array.from({ length: 13 }, (_, index) => {
        const hour = (18 + index) % 24;
        const date = hour >= 18 ? day : next;

        return { time: `${date}T${String(hour).padStart(2, '0')}:00`, clouds: clouds(hour) };
    });

describe('stargazingWindow()', () => {
    it('should find the dark, clear hours of a moonless night', () => {
        // New moon on 19 March 2026. The sun is 12° down just after 20:00, clouds come in at 03:00.
        const hours = hourly(
            night('2026-03-19', '2026-03-20', (hour) => (hour >= 3 && hour < 18 ? 90 : 10)),
        );
        const window = stargazingWindow(
            hours,
            { start: new Date(2026, 2, 19, 18, 40), end: new Date(2026, 2, 20, 6, 30) },
            home,
        );

        expect(window).toEqual({
            start: new Date(2026, 2, 19, 20, 30),
            end: new Date(2026, 2, 20, 2, 30),
        });
    });

    it('should wait for the rest of the night to begin, when it is already dark', () => {
        const hours = hourly(night('2026-03-19', '2026-03-20', () => 0));
        const window = stargazingWindow(
            hours,
            { start: new Date(2026, 2, 19, 23, 10), end: new Date(2026, 2, 20, 6, 30) },
            home,
        );

        expect(window?.start).toEqual(new Date(2026, 2, 19, 23, 10));
    });

    it('should not count a full moon high in the sky as dark', () => {
        // Full moon on 3 March 2026, up all night
        const hours = hourly(night('2026-03-03', '2026-03-04', () => 0));

        expect(
            stargazingWindow(
                hours,
                { start: new Date(2026, 2, 3, 18, 20), end: new Date(2026, 2, 4, 7, 0) },
                home,
            ),
        ).toBeUndefined();
    });

    it('should not promise a single clear hour', () => {
        const hours = hourly(night('2026-03-19', '2026-03-20', (hour) => (hour === 22 ? 0 : 80)));

        expect(
            stargazingWindow(
                hours,
                { start: new Date(2026, 2, 19, 18, 40), end: new Date(2026, 2, 20, 6, 30) },
                home,
            ),
        ).toBeUndefined();
    });
});

describe('sunsetColour()', () => {
    const sunset = new Date(2026, 2, 1, 18, 30);
    const at = (hour: Omit<Hour, 'time'>, rainAfter = 0): OpenMeteoForecastHourly =>
        hourly([
            { time: '2026-03-01T18:00', ...hour },
            { time: '2026-03-01T19:00', ...hour, rain: rainAfter },
        ]);

    it('should expect a vivid sunset with some high clouds over a clear horizon', () => {
        expect(sunsetColour(at({ low: 10, mid: 20, high: 50 }), sunset)).toBe('vivid');
    });

    it('should expect some colour with thinner or thicker high clouds', () => {
        expect(sunsetColour(at({ low: 40, high: 20 }), sunset)).toBe('some');
        expect(sunsetColour(at({ low: 10, high: 85 }), sunset)).toBe('some');
    });

    it('should expect nothing special from a clear sky, low clouds or rain', () => {
        expect(sunsetColour(at({}), sunset)).toBeUndefined();
        expect(sunsetColour(at({ low: 80, high: 50 }), sunset)).toBeUndefined();
        expect(sunsetColour(at({ low: 10, high: 50 }, 0.4), sunset)).toBeUndefined();
    });

    it('should not guess without a forecast around sunset', () => {
        expect(sunsetColour(at({ high: 50 }), new Date(2026, 2, 2, 18, 30))).toBeUndefined();
    });
});

describe('daylightChange()', () => {
    it('should compare tomorrow with today', () => {
        // 07:00–18:30 today, 06:58–18:32 tomorrow
        expect(daylightChange(forecastDailyMock)).toBe(4);
    });
});
