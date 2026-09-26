import { DNB } from '../models/dnb.model';
import { describe, expect, it } from 'vitest';
import { DNBSerializer } from './dnb.serializer';

describe('DNBSerializer', () => {
    const serializer = new DNBSerializer();
    const json = { title: 'dnb_song', artist: 'dnb_artist' };

    it('should serialize from json to model', () => {
        expect(serializer.fromJson(json as DNB)).toEqual(new DNB('dnb_song', 'dnb_artist'));
    });

    it('should serialize from model to json', () => {
        expect(serializer.toJson(new DNB('dnb_song', 'dnb_artist'))).toEqual(json);
    });
});
