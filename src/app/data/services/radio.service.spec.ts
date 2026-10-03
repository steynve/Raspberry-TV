import { RadioService } from './radio.service';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { NowPlaying, RadioChannel } from '../models/radio-channel.model';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('RadioService', () => {
    let service: RadioService;
    let httpMock: HttpTestingController;

    const channel = (apiSrc: RadioChannel['apiSrc']): RadioChannel =>
        service.radioChannels.find((radioChannel) => radioChannel.apiSrc === apiSrc)!;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });

        service = TestBed.inject(RadioService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it("should read KINK's song for the station", () => {
        let result: NowPlaying | undefined;
        service.getNowPlaying(channel('KINK')).subscribe((nowPlaying) => (result = nowPlaying));

        httpMock.expectOne('https://api.kink.nl/static/now-playing.json').flush({
            playing: 'kink_song - kink_artist',
            extended: { kink: { title: 'kink_song', artist: 'kink_artist' } },
        });

        expect(result).toEqual({ song: 'kink_song', artist: 'kink_artist' });
    });

    it("should read FLUX's song for the channel", () => {
        const flux = channel('FLUX');
        let result: NowPlaying | undefined;
        service.getNowPlaying(flux).subscribe((nowPlaying) => (result = nowPlaying));

        httpMock
            .expectOne(`https://fluxmusic.api.radiosphere.io/channels/${flux.apiRef}/current-track`)
            .flush({
                trackInfo: {
                    title: 'flux_song',
                    artistCredits: 'flux_artistCredits',
                    artists: [{ name: 'flux_artist' }],
                },
            });

        expect(result).toEqual({ song: 'flux_song', artist: 'flux_artistCredits' });
    });

    it("should read DNB's song", () => {
        let result: NowPlaying | undefined;
        service.getNowPlaying(channel('DNB')).subscribe((nowPlaying) => (result = nowPlaying));

        httpMock
            .expectOne('https://api.dnbradio.nl/now_playing')
            .flush({ title: 'dnb_song', artist: 'dnb_artist' });

        expect(result).toEqual({ song: 'dnb_song', artist: 'dnb_artist' });
    });

    it('should not request anything for channels without an API', () => {
        const next = vi.fn();

        service.getNowPlaying(channel('NONE')).subscribe(next);

        expect(next).not.toHaveBeenCalled();
    });
});
