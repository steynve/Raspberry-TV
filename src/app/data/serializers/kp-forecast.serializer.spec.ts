import { describe, expect, it } from 'vitest';
import { KpForecastSerializer } from './kp-forecast.serializer';
import { KpForecast } from '../models/kp-forecast.model';

describe('KpForecastSerializer', () => {
    const serializer = new KpForecastSerializer();
    const json = [{ time_tag: '2026-03-01T21:00:00', kp: 7.33 }];

    it('should serialize from json to model and back', () => {
        const result = serializer.fromJson(json as never);

        expect(result).toEqual(
            new KpForecast([{ start: new Date(Date.UTC(2026, 2, 1, 21)), kp: 7.33 }]),
        );
        expect(serializer.toJson(result)).toEqual(json);
    });
});
