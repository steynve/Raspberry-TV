import { Kink } from '../models/kink.model';
import { describe, expect, it } from 'vitest';
import { KinkSerializer } from './kink.serializer';
import { RadioServiceMock } from '../services/mocks/radio.service.mock';

describe('KinkSerializer', () => {
    const serializer = new KinkSerializer();
    const { kinkResponse } = new RadioServiceMock();

    it('should serialize from json to model', () => {
        const result = serializer.fromJson(serializer.toJson(kinkResponse) as Kink);

        expect(result).toBeInstanceOf(Kink);
        expect(result).toEqual(kinkResponse);
    });

    it('should serialize from model to json', () => {
        expect(serializer.toJson(kinkResponse)).toEqual({
            stations: kinkResponse.stations,
            playing: kinkResponse.playing,
            extended: kinkResponse.extended,
            hitlist: kinkResponse.hitlist,
        });
    });
});
