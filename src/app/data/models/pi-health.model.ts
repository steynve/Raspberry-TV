// Written every minute by pi/pi-health.sh on the Pi. Readings the Pi couldn't take are null.
export interface PiHealth {
    time: number; // unix seconds
    temperature: number | null; // °C
    uptime: number | null; // seconds
    memoryTotal: number | null; // kB
    memoryAvailable: number | null; // kB
    load: number | null; // 1 minute load average
    disk: number | null; // % used
    throttled: string; // vcgencmd get_throttled, e.g. "0x50000"
}
