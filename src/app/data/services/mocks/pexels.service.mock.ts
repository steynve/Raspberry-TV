import { Observable, of } from 'rxjs';
import { Photos } from '@data/models/photos.model';

// A photo for every day of the month
const photos: Photos = {
    photos: Array.from({ length: 32 }, () => ({
        avg_color: '#ffffff',
        src: { original: 'original.jpg' },
    })),
};

export class PexelsServiceMock {
    getPhotos(): Observable<Photos> {
        return of(photos);
    }
}
