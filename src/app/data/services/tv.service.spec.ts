import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TvService, TvState } from './tv.service';

describe('TvService', () => {
    let service: TvService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(TvService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    const read = (
        flush: (request: ReturnType<HttpTestingController['expectOne']>) => void,
    ): TvState[] => {
        const states: TvState[] = [];
        service.getState().subscribe((state) => states.push(state));
        flush(httpMock.expectOne((request) => request.url === '/live/tv'));

        return states;
    };

    it('should read what the TV last said, bypassing the browser cache', () => {
        expect(
            read((request) => {
                expect(request.request.params.get('t')).toMatch(/^\d+$/);
                request.flush('off\n');
            }),
        ).toEqual(['off']);
        expect(read((request) => request.flush('on\n'))).toEqual(['on']);
    });

    it('should say nothing when the TV has said nothing yet', () => {
        expect(
            read((request) => request.flush('', { status: 404, statusText: 'Not Found' })),
        ).toEqual([]);
    });
});
