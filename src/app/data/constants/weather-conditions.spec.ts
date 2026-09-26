import { describe, expect, it } from 'vitest';
import { weatherCondition } from './weather-conditions';

describe('weatherCondition()', () => {
    it('should return the day or night variant', () => {
        expect(weatherCondition(0, true)).toEqual({ description: 'Sunny', icon: 'sun' });
        expect(weatherCondition(0, false)).toEqual({ description: 'Clear', icon: 'moon' });
        expect(weatherCondition(2, false).icon).toBe('cloud-moon');
    });

    it('should fall back to a plain cloud for unknown codes', () => {
        expect(weatherCondition(42)).toEqual({ description: '', icon: 'cloud' });
    });
});
