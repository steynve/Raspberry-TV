import { PiHealth } from '@data/models/pi-health.model';

export class PiHealthSerializer {
    public fromJson(json: PiHealth): PiHealth {
        return new PiHealth(
            json.time,
            json.temperature,
            json.uptime,
            json.memoryTotal,
            json.memoryAvailable,
            json.load,
            json.disk,
            json.throttled,
        );
    }

    public toJson(health: PiHealth): object {
        return { ...health };
    }
}
