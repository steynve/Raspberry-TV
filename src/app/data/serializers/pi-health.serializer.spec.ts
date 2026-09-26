import { describe, expect, it } from 'vitest';
import { PiHealth } from '../models/pi-health.model';
import { PiHealthSerializer } from './pi-health.serializer';
import { piHealthMock } from '../services/mocks/pi-health.mock';

describe('PiHealthSerializer', () => {
    const serializer = new PiHealthSerializer();

    it('should serialize from json to model and back', () => {
        const json = serializer.toJson(piHealthMock());
        const result = serializer.fromJson(json as PiHealth);

        expect(result).toBeInstanceOf(PiHealth);
        expect(result).toEqual(piHealthMock());
    });
});
