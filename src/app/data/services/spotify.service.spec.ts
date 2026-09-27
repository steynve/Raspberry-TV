import { TestBed } from '@angular/core/testing';
import { SpotifyService } from './spotify.service';
import { provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpotifyState } from '@data/models/spotify-state.model';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('SpotifyService', () => {
    let service: SpotifyService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(SpotifyService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should read the live state from the Pi, bypassing the browser cache', () => {
        let result: SpotifyState | undefined;
        service.getState().subscribe((state) => (result = state));

        const request = httpMock.expectOne((req) => req.url === '/live/spotify.json');
        expect(request.request.params.get('t')).toMatch(/^\d+$/);
        request.flush({
            time: 1,
            active: true,
            playing: true,
            title: 'Everlong',
            artist: 'Foo Fighters',
            album: '',
        });

        expect(result).toEqual(new SpotifyState(1, true, true, 'Everlong', 'Foo Fighters', ''));
    });

    it('should pause through the control on the Pi', () => {
        service.pause().subscribe();

        const request = httpMock.expectOne('/control/spotify-pause');
        expect(request.request.method).toBe('POST');
        request.flush('paused');
    });
});
