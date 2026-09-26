import { describe, expect, it } from 'vitest';
import { forecastHourlyMock } from '@data/services/mocks/openmeteo.mock';
import { OpenMeteoForecastHourly } from '@data/models/openmeteo-forecast-hourly.model';
import { averageCloudCover, currentGusts, trailCondition } from './outdoors';

const hourly = (precipitation: number[], evaporation: number[]): OpenMeteoForecastHourly =>
    new OpenMeteoForecastHourly(
        precipitation.map((_, index) => `2026-03-01T${String(index).padStart(2, '0')}:00`),
        precipitation,
        evaporation,
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
