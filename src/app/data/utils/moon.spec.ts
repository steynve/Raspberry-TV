import { describe, expect, it } from 'vitest';
import { moonPath, moonPhase } from './moon';

describe('moonPhase()', () => {
    it('should match known new and full moons', () => {
        const newMoon = moonPhase(new Date(Date.UTC(2024, 0, 11, 11, 57)));
        const fullMoon = moonPhase(new Date(Date.UTC(2024, 0, 25, 17, 54)));

        expect(newMoon.name).toBe('New moon');
        expect(newMoon.illumination).toBeLessThan(0.01);
        expect(fullMoon.name).toBe('Full moon');
        expect(fullMoon.illumination).toBeGreaterThan(0.99);
    });

    it('should name the quarters', () => {
        // First quarter 2024-01-18 03:52 UTC, last quarter 2024-02-02 23:18 UTC
        expect(moonPhase(new Date(Date.UTC(2024, 0, 18, 3, 52))).name).toBe('First quarter');
        expect(moonPhase(new Date(Date.UTC(2024, 1, 2, 23, 18))).name).toBe('Last quarter');
    });
});

describe('moonPath()', () => {
    it('should light the right half at first quarter and the left half at last quarter', () => {
        expect(moonPath(0.25)).toBe('M 12 2 A 10 10 0 0 1 12 22 A 0.000 10 0 0 1 12 2 Z');
        expect(moonPath(0.75)).toBe('M 12 2 A 10 10 0 0 0 12 22 A 0.000 10 0 0 0 12 2 Z');
    });

    it('should bulge the terminator towards the lit side for a crescent', () => {
        // Waxing crescent: outline and terminator both pass the right side
        expect(moonPath(0.1)).toMatch(/A 10 10 0 0 1 12 22 A [\d.]+ 10 0 0 0 12 2/);
    });

    it('should fill the whole disc at full moon', () => {
        expect(moonPath(0.5)).toBe('M 12 2 A 10 10 0 0 0 12 22 A 10.000 10 0 0 0 12 2 Z');
    });
});
