import { PiHealth } from '@data/models/pi-health.model';

// A healthy Pi, measured at 2026-03-01 12:00 local time
export const piHealthMock = (overrides: Partial<PiHealth> = {}): PiHealth => ({
    time: new Date(2026, 2, 1, 12).getTime() / 1000,
    temperature: 51.2,
    uptime: 1036812,
    memoryTotal: 948304,
    memoryAvailable: 536120,
    load: 0.42,
    disk: 38,
    throttled: '0x0',
    ...overrides,
});
