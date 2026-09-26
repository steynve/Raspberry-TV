import { sunState } from './sun';
import { describe, expect, it } from 'vitest';
import { forecastDailyMock } from '@data/services/mocks/openmeteo.mock';

// Sunrise 07:00 and sunset 18:30 today, sunrise 06:58 tomorrow
describe('sunState()', () => {
    it('should count down the daylight during the day', () => {
        const state = sunState(forecastDailyMock, new Date(2026, 2, 1, 12));

        expect(state.phase).toBe('day');
        expect(state.daylightLeft).toBe(390);
        expect(state.sunset).toBe('18:30');
        expect(state.night).toEqual({
            start: new Date(2026, 2, 1, 18, 30),
            end: new Date(2026, 2, 2, 6, 58),
        });
    });

    it('should be golden hour in the last hour before sunset', () => {
        const state = sunState(forecastDailyMock, new Date(2026, 2, 1, 17, 45));

        expect(state.phase).toBe('golden-hour');
        expect(state.daylightLeft).toBe(45);
    });

    it("should be night after sunset, until tomorrow's sunrise", () => {
        const now = new Date(2026, 2, 1, 22);
        const state = sunState(forecastDailyMock, now);

        expect(state.phase).toBe('night');
        expect(state.daylightLeft).toBe(0);
        expect(state.nextSunrise).toBe('06:58');
        expect(state.night).toEqual({ start: now, end: new Date(2026, 2, 2, 6, 58) });
    });

    it("should be night before sunrise, until today's sunrise", () => {
        const now = new Date(2026, 2, 1, 5);
        const state = sunState(forecastDailyMock, now);

        expect(state.phase).toBe('night');
        expect(state.nextSunrise).toBe('07:00');
        expect(state.night).toEqual({ start: now, end: new Date(2026, 2, 1, 7) });
    });
});
