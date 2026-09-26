import { firstValueFrom } from 'rxjs';
import { Photos } from '../models/photos.model';
import { describe, expect, it } from 'vitest';
import { PhotosSerializer } from './photos.serializer';
import { PexelsServiceMock } from '../services/mocks/pexels.service.mock';

describe('PhotosSerializer', () => {
    const serializer = new PhotosSerializer();

    it('should serialize from json to model and back', async () => {
        const photos = await firstValueFrom(new PexelsServiceMock().getPhotos());
        const json = serializer.toJson(photos);
        const result = serializer.fromJson(json as Photos);

        expect(result).toBeInstanceOf(Photos);
        expect(result).toEqual(photos);
    });
});
