import { describe, expect, it } from 'vitest';
import { piHealthMock } from '@data/services/mocks/pi-health.mock';
import { formatUptime, memoryUsed, minutesSince, piAlerts, throttledState } from './pi';

describe('pi', () => {
    const now = new Date(2026, 2, 1, 12, 0, 30);

    it('should read the throttled flags', () => {
        expect(throttledState('0x0')).toEqual({
            underVoltage: false,
            throttled: false,
            underVoltageOccurred: false,
        });
        expect(throttledState('0x50005')).toEqual({
            underVoltage: true,
            throttled: true,
            underVoltageOccurred: true,
        });
        expect(throttledState('0x50000')?.underVoltageOccurred).toBe(true);
        expect(throttledState('unknown')).toBeUndefined();
    });

    it('should calculate the memory in use', () => {
        expect(memoryUsed(piHealthMock())).toBeCloseTo(0.4347, 3);
        expect(memoryUsed(piHealthMock({ memoryTotal: null }))).toBeUndefined();
    });

    it('should raise nothing for a healthy Pi', () => {
        expect(piAlerts(piHealthMock(), now)).toEqual([]);
    });

    it('should raise what needs attention', () => {
        const health = piHealthMock({
            temperature: 78.4,
            throttled: '0x50005',
            disk: 93,
            memoryAvailable: 50000,
        });

        expect(piAlerts(health, now)).toEqual([
            '78 °C',
            'Under-voltage',
            'Throttled',
            'Memory full',
            'Storage full',
        ]);
    });

    it('should notice when the measurements stop', () => {
        const later = new Date(2026, 2, 1, 12, 7);

        expect(minutesSince(piHealthMock(), later)).toBe(7);
        expect(piAlerts(piHealthMock(), later)).toEqual(['No measurement for 7 min']);
    });

    it('should cope with readings the Pi could not take', () => {
        const health = piHealthMock({
            temperature: null,
            disk: null,
            memoryAvailable: null,
            load: null,
        });

        expect(piAlerts(health, now)).toEqual([]);
    });

    it('should format the uptime', () => {
        expect(formatUptime(1036812)).toBe('12 days 0h');
        expect(formatUptime(90000)).toBe('1 day 1h');
        expect(formatUptime(3900)).toBe('1h 5m');
        expect(formatUptime(300)).toBe('5m');
    });
});
