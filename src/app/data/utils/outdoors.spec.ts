import { describe, expect, it } from 'vitest';
import { forecastDailyMock, forecastHourlyMock } from '@data/services/mocks/openmeteo.mock';
import { OpenMeteoForecastHourly } from '@data/models/openmeteo-forecast-hourly.model';
import { averageCloudCover, currentGusts, rideOutlook, trailCondition } from './outdoors';

const hourly = (precipitation: number[], evaporation: number[]): OpenMeteoForecastHourly =>
    new OpenMeteoForecastHourly(
        precipitation.map((_, index) => `2026-03-01T${String(index).padStart(2, '0')}:00`),
        precipitation,
        evaporation,
        precipitation.map(() => 0),
        precipitation.map(() => 0),
        precipitation.map(() => 0),
        precipitation.map(() => 0),
        precipitation.map(() => 0),
        precipitation.map(() => 0),
    );

describe('trailCondition()', () => {
    const now = new Date(2026, 2, 1, 23);

    it('should be dry without rain', () => {
        expect(trailCondition(hourly([0, 0, 0], [0.2, 0.2, 0.2]), now)).toBe('dry');
    });

    it('should be muddy right after a lot of rain, and dry out with evaporation', () => {
        // 6 mm, then 0.5 mm evaporation per hour (see the mock)
        expect(trailCondition(forecastHourlyMock, new Date(2026, 2, 1, 10))).toBe('muddy');
        expect(trailCondition(forecastHourlyMock, new Date(2026, 2, 1, 13))).toBe('muddy');
        expect(
            trailCondition(
                hourly([6, 0, 0, 0, 0, 0, 0, 0], [0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]),
                now,
            ),
        ).toBe('wet');
    });

    it('should not let earlier evaporation offset later rain', () => {
        expect(trailCondition(hourly([0, 0, 0, 2], [5, 5, 5, 0]), now)).toBe('wet');
    });

    it('should ignore the forecast', () => {
        expect(trailCondition(forecastHourlyMock, new Date(2026, 2, 1, 9))).toBe('dry');
    });
});

describe('currentGusts()', () => {
    it('should return the gusts of the current hour', () => {
        expect(currentGusts(forecastHourlyMock, new Date(2026, 2, 1, 11, 40))).toBe(32.6);
        expect(currentGusts(forecastHourlyMock, new Date(2026, 2, 1, 9))).toBeUndefined();
    });
});

describe('averageCloudCover()', () => {
    it('should average the hours in the window, starting from the current hour', () => {
        expect(
            averageCloudCover(
                forecastHourlyMock,
                new Date(2026, 2, 1, 11, 30),
                new Date(2026, 2, 1, 13),
            ),
        ).toBe(45);
        expect(
            averageCloudCover(forecastHourlyMock, new Date(2026, 2, 2), new Date(2026, 2, 3)),
        ).toBeUndefined();
    });
});

type Bad = Partial<Record<'rain' | 'chance' | 'gusts', number>>;

describe('rideOutlook()', () => {
    // Every hour of 1 and 2 March, good to ride unless `bad` says otherwise. The mock's sun rises at
    // 07:00 and sets at 18:30 on the 1st, and 06:58 to 18:32 on the 2nd.
    const hours = (bad: (time: string) => Bad = () => ({})): OpenMeteoForecastHourly => {
        const time = [1, 2].flatMap((day) =>
            Array.from(
                { length: 24 },
                (_, hour) => `2026-03-0${day}T${String(hour).padStart(2, '0')}:00`,
            ),
        );
        const values = time.map(bad);

        return new OpenMeteoForecastHourly(
            time,
            values.map((value) => value.rain ?? 0),
            time.map(() => 0),
            time.map(() => 0),
            values.map((value) => value.gusts ?? 20),
            values.map((value) => value.chance ?? 0),
            time.map(() => 0),
            time.map(() => 0),
            time.map(() => 0),
        );
    };
    const at = (hour: number, minute = 0): Date => new Date(2026, 2, 1, hour, minute);

    it('should say ride now when it stays good until dark', () => {
        expect(rideOutlook(hours(), forecastDailyMock, at(12, 20))).toEqual({
            tomorrow: false,
            window: { start: at(12, 20), end: at(18, 30), untilDark: true },
        });
    });

    it('should pick the longest dry stretch, where each value is for the hour before it', () => {
        // Rain from 14:00 to 15:00
        const outlook = rideOutlook(
            hours((time) => (time === '2026-03-01T15:00' ? { rain: 1.2 } : {})),
            forecastDailyMock,
            at(11),
        );

        expect(outlook.window).toEqual({ start: at(15), end: at(18, 30), untilDark: true });
    });

    it('should count a likely shower and strong gusts as bad too', () => {
        const outlook = rideOutlook(
            hours((time) =>
                time < '2026-03-01T15:00'
                    ? { chance: 60 }
                    : time < '2026-03-01T17:00'
                      ? {}
                      : { gusts: 65 },
            ),
            forecastDailyMock,
            at(9),
        );

        expect(outlook.window).toEqual({ start: at(14), end: at(16), untilDark: false });
    });

    it('should not suggest a stretch too short for a ride', () => {
        const outlook = rideOutlook(
            hours((time) => (time.endsWith('T16:00') ? {} : { rain: 0.5 })),
            forecastDailyMock,
            at(9),
        );

        expect(outlook).toEqual({ tomorrow: false });
    });

    it('should look at tomorrow after sunset', () => {
        const outlook = rideOutlook(hours(), forecastDailyMock, at(19));

        expect(outlook).toEqual({
            tomorrow: true,
            window: {
                start: new Date(2026, 2, 2, 6, 58),
                end: new Date(2026, 2, 2, 18, 32),
                untilDark: true,
            },
        });
    });
});
