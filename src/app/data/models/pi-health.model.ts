import { AbstractModel } from './abstract.model';

// Written every minute by pi/pi-health.sh on the Pi. Readings the Pi couldn't take are null.
export class PiHealth extends AbstractModel {
    constructor(
        public time: number, // unix seconds
        public temperature: number | null, // °C
        public uptime: number | null, // seconds
        public memoryTotal: number | null, // kB
        public memoryAvailable: number | null, // kB
        public load: number | null, // 1 minute load average
        public disk: number | null, // % used
        public throttled: string, // vcgencmd get_throttled, e.g. "0x50000"
    ) {
        super();
    }
}
