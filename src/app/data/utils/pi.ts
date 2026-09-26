import { PiHealth } from '@data/models/pi-health.model';

const STALE_AFTER = 5; // minutes without a new measurement

// vcgencmd get_throttled: bits 0-3 are the current state, bits 16-19 whether it happened since boot
export const throttledState = (
    throttled: string,
): { underVoltage: boolean; throttled: boolean; underVoltageOccurred: boolean } | undefined => {
    const value = Number.parseInt(throttled, 16);

    if (Number.isNaN(value)) return undefined;

    return {
        underVoltage: (value & 0x1) !== 0,
        throttled: (value & 0x4) !== 0,
        underVoltageOccurred: (value & 0x10000) !== 0,
    };
};

export const minutesSince = (health: PiHealth, now: Date): number =>
    Math.max(0, Math.floor((now.getTime() / 1000 - health.time) / 60));

export const memoryUsed = (health: PiHealth): number | undefined =>
    health.memoryTotal && health.memoryAvailable !== null
        ? 1 - health.memoryAvailable / health.memoryTotal
        : undefined;

// Only the things worth interrupting the screen for
export const piAlerts = (health: PiHealth, now: Date): string[] => {
    const state = throttledState(health.throttled);
    const minutesAgo = minutesSince(health, now);

    return [
        minutesAgo >= STALE_AFTER && `No measurement for ${minutesAgo} min`,
        (health.temperature ?? 0) >= 75 && `${Math.round(health.temperature ?? 0)} °C`,
        state?.underVoltage && 'Under-voltage',
        state?.throttled && 'Throttled',
        (memoryUsed(health) ?? 0) >= 0.9 && 'Memory full',
        (health.disk ?? 0) >= 90 && 'Storage full',
    ].filter((alert): alert is string => !!alert);
};

export const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / (60 * 60 * 24));
    const hours = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    if (days) return `${days} ${days === 1 ? 'day' : 'days'} ${hours}h`;

    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};
