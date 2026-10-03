import { PiHealth } from '@data/models/pi-health.model';

const STALE_AFTER = 5; // minutes without a new measurement

// Worth a warning from here on
export const HOT = 75; // °C
export const FULL = 0.9; // memory and storage

// vcgencmd get_throttled: bit 0 is under-voltage right now, bit 2 throttling right now
const UNDER_VOLTAGE = 0x1;
const THROTTLED = 0x4;

export const minutesSince = (health: PiHealth, now: Date): number =>
    Math.max(0, Math.floor((now.getTime() / 1000 - health.time) / 60));

export const memoryUsed = (health: PiHealth): number | undefined =>
    health.memoryTotal && health.memoryAvailable !== null
        ? 1 - health.memoryAvailable / health.memoryTotal
        : undefined;

// Only the things worth interrupting the screen for
export const piAlerts = (health: PiHealth, now: Date): string[] => {
    const throttled = Number.parseInt(health.throttled, 16) || 0; // "unknown" without vcgencmd
    const minutesAgo = minutesSince(health, now);

    return [
        minutesAgo >= STALE_AFTER && `No measurement for ${minutesAgo} min`,
        (health.temperature ?? 0) >= HOT && `${Math.round(health.temperature ?? 0)} °C`,
        !!(throttled & UNDER_VOLTAGE) && 'Under-voltage',
        !!(throttled & THROTTLED) && 'Throttled',
        (memoryUsed(health) ?? 0) >= FULL && 'Memory full',
        (health.disk ?? 0) >= FULL * 100 && 'Storage full',
    ].filter((alert): alert is string => !!alert);
};

export const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / (60 * 60 * 24));
    const hours = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    if (days) return `${days} ${days === 1 ? 'day' : 'days'} ${hours}h`;

    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};
