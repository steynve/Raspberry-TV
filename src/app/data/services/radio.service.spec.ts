import { RadioService } from './radio.service';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { RadioChannel } from '../models/radio-channel.model';
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

    it('should request KINK now playing', () => {
        service.getNowPlaying(channel('KINK')).subscribe();

        httpMock.expectOne('https://api.kink.nl/static/now-playing.json').flush({});
    });

    it('should request FLUX now playing for the channel', () => {
        const flux = channel('FLUX');

        service.getNowPlaying(flux).subscribe();

        httpMock
            .expectOne(`https://fluxmusic.api.radiosphere.io/channels/${flux.apiRef}/current-track`)
            .flush({});
    });

    it('should request DNB now playing', () => {
        service.getNowPlaying(channel('DNB')).subscribe();

        httpMock.expectOne('https://api.dnbradio.nl/now_playing').flush({});
    });

    it('should not request anything for channels without an API', () => {
        const next = vi.fn();

        service.getNowPlaying(channel('NONE')).subscribe(next);

        expect(next).not.toHaveBeenCalled();
    });
});
