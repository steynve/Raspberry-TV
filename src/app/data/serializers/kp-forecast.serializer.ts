import { KpForecast } from '@data/models/kp-forecast.model';
import { AbstractModel } from '@data/models/abstract.model';

interface NoaaKpRow {
    time_tag: string; // UTC, without a zone designator
    kp: number;
}

export class KpForecastSerializer {
    // NOAA sends a plain array, not an object like the other APIs
    public fromJson(json: AbstractModel): KpForecast {
        return new KpForecast(
            (json as unknown as NoaaKpRow[]).map((row) => ({
                start: new Date(`${row.time_tag}Z`),
                kp: row.kp,
            })),
        );
    }

    public toJson(forecast: KpForecast): object {
        return forecast.blocks.map((block) => ({
            time_tag: block.start.toISOString().slice(0, 19),
            kp: block.kp,
        }));
    }
}
