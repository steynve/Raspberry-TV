import { Npm } from '../models/npm.model';
import { describe, expect, it } from 'vitest';
import { NpmSerializer } from './npm.serializer';

describe('NpmSerializer', () => {
    const serializer = new NpmSerializer();

    it('should map dist-tags to distTags', () => {
        const result = serializer.fromJson({
            name: '@angular/core',
            'dist-tags': { latest: '22.2.0' },
        } as Npm);

        expect(result).toEqual(new Npm('@angular/core', { latest: '22.2.0' }));
    });

    it('should serialize from model to json', () => {
        expect(serializer.toJson(new Npm('@angular/core', { latest: '22.2.0' }))).toEqual({
            name: '@angular/core',
            'dist-tags': { latest: '22.2.0' },
        });
    });
});
