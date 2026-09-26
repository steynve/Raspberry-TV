import { describe, expect, it } from 'vitest';
import { RainSlot, rainSummary, upcomingRain } from './rain';
import { OpenMeteoForecastMinutely15 } from '@data/models/openmeteo-forecast-minutely15.model';

// Nine quarters of an hour from 12:00, with the given precipitation in mm per 15 minutes
const slots = (...precipitation: number[]): RainSlot[] =>
    precipitation.map((value, index) => ({
        time: new Date(2026, 2, 1, 12, index * 15),
        precipitation: value,
    }));

describe('upcomingRain()', () => {
    const times = Array.from({ length: 12 }, (_, index) => {
        const date = new Date(2026, 2, 1, 11, index * 15);
        return `2026-03-01T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    });
    const minutely15 = new OpenMeteoForecastMinutely15(
        times,
        times.map((_, index) => index / 10),
    );

    it('should start at the current quarter of an hour and span 2 hours', () => {
        const result = upcomingRain(minutely15, new Date(2026, 2, 1, 11, 20));

        expect(result.length).toBe(9);
        expect(result[0].time).toEqual(new Date(2026, 2, 1, 11, 15));
        expect(result[0].precipitation).toBe(0.1);
        expect(result[8].time).toEqual(new Date(2026, 2, 1, 13, 15));
    });
});

describe('rainSummary()', () => {
    it('should say when it stays dry', () => {
        expect(rainSummary(slots(0, 0, 0, 0, 0, 0, 0, 0, 0))).toBe('Dry for the next 2 hours');
    });

    it('should say when rain starts', () => {
        expect(rainSummary(slots(0, 0, 0.3, 0.2, 0, 0, 0, 0, 0))).toBe('Light rain from 12:30');
    });

    it('should say when rain stops', () => {
        expect(rainSummary(slots(1, 0.8, 0, 0, 0, 0, 0, 0, 0))).toBe('Rain until 12:30');
    });

    it('should say when it keeps raining', () => {
        expect(rainSummary(slots(3, 3, 3, 3, 3, 3, 3, 3, 3))).toBe(
            'Heavy rain for the next 2 hours',
        );
    });
});
