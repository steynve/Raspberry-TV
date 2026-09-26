import { Flux } from '../models/flux.model';
import { describe, expect, it } from 'vitest';
import { FluxSerializer } from './flux.serializer';
import { RadioServiceMock } from '../services/mocks/radio.service.mock';

describe('FluxSerializer', () => {
    const serializer = new FluxSerializer();
    const { fluxResponse } = new RadioServiceMock();

    it('should serialize from json to model', () => {
        const result = serializer.fromJson({ trackInfo: fluxResponse.trackInfo } as Flux);

        expect(result).toBeInstanceOf(Flux);
        expect(result).toEqual(fluxResponse);
    });

    it('should serialize from model to json', () => {
        expect(serializer.toJson(fluxResponse)).toEqual({ trackInfo: fluxResponse.trackInfo });
    });
});
