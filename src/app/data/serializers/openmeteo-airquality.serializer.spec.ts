import { describe, expect, it } from 'vitest';
import { OpenMeteoAirQuality } from '../models/openmeteo-airquality.model';
import { OpenMeteoAirqualitySerializer } from './openmeteo-airquality.serializer';

describe('OpenMeteoAirqualitySerializer', () => {
    const serializer = new OpenMeteoAirqualitySerializer();
    const json = {
        current: { birch_pollen: 25, grass_pollen: 3 },
    } as unknown as OpenMeteoAirQuality;

    it('should serialize from json to model', () => {
        const result = serializer.fromJson(json);

        expect(result).toBeInstanceOf(OpenMeteoAirQuality);
        expect(result.current).toEqual(json.current);
    });

    it('should serialize from model to json', () => {
        expect(serializer.toJson(serializer.fromJson(json))).toEqual(json);
    });
});
