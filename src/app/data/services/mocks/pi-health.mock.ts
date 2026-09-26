import { PiHealth } from '../../models/pi-health.model';

// A healthy Pi, measured at 2026-03-01 12:00 local time
export const piHealthMock = (overrides: Partial<PiHealth> = {}): PiHealth =>
    Object.assign(
        new PiHealth(
            new Date(2026, 2, 1, 12).getTime() / 1000,
            51.2,
            1036812,
            948304,
            536120,
            0.42,
            38,
            '0x0',
        ),
        overrides,
    );
