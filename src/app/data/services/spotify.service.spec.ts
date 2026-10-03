import { TestBed } from '@angular/core/testing';
import { SpotifyService } from './spotify.service';
import { provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpotifyState } from '@data/models/spotify-state.model';
import { spotifyStateMock } from './mocks/spotify.mock';
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
        request.flush(spotifyStateMock());

        expect(result).toEqual(spotifyStateMock());
    });

    it('should disconnect through the control on the Pi', () => {
        service.disconnect().subscribe();

        const request = httpMock.expectOne('/control/spotify-disconnect');
        expect(request.request.method).toBe('POST');
        request.flush('disconnected');
    });
});
