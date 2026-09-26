import { describe, expect, it } from 'vitest';
import { formatDuration, formatTime } from './time';

describe('time', () => {
    it('should format a time on a 24-hour clock', () => {
        expect(formatTime(new Date(2026, 2, 1, 7, 5))).toBe('07:05');
    });

    it('should format a duration in hours and minutes', () => {
        expect(formatDuration(130)).toBe('2h 10m');
        expect(formatDuration(125)).toBe('2h 05m');
        expect(formatDuration(42)).toBe('42m');
    });
});
