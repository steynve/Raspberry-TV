import { describe, expect, it } from 'vitest';
import { auroraChance, maxKp } from './aurora';
import { KpForecast } from '@data/models/kp-forecast.model';

describe('aurora', () => {
    // 3 hour blocks from 18:00 UTC: Kp 2, 7.33, 4
    const forecast = new KpForecast([
        { start: new Date(Date.UTC(2026, 2, 1, 18)), kp: 2 },
        { start: new Date(Date.UTC(2026, 2, 1, 21)), kp: 7.33 },
        { start: new Date(Date.UTC(2026, 2, 2, 0)), kp: 4 },
    ]);

    it('should take the highest Kp of every block that overlaps the window', () => {
        expect(
            maxKp(forecast, new Date(Date.UTC(2026, 2, 1, 20)), new Date(Date.UTC(2026, 2, 2, 6))),
        ).toBe(7.33);
        expect(
            maxKp(forecast, new Date(Date.UTC(2026, 2, 2, 1)), new Date(Date.UTC(2026, 2, 2, 6))),
        ).toBe(4);
        expect(
            maxKp(forecast, new Date(Date.UTC(2026, 2, 3)), new Date(Date.UTC(2026, 2, 4))),
        ).toBeUndefined();
    });

    it('should only mention a chance from Kp 6', () => {
        expect(auroraChance(undefined)).toBeUndefined();
        expect(auroraChance(5.67)).toBeUndefined();
        expect(auroraChance(6.33)).toBe('Northern lights possible · Kp 6');
        expect(auroraChance(8)).toBe('Good chance of northern lights · Kp 8');
    });
});
