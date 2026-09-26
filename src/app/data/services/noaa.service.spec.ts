import { TestBed } from '@angular/core/testing';
import { NoaaService } from './noaa.service';
import { provideHttpClient } from '@angular/common/http';
import { KpForecast } from '@data/models/kp-forecast.model';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('NoaaService', () => {
    let service: NoaaService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(NoaaService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should fetch the Kp forecast and read the times as UTC', () => {
        let result: KpForecast | undefined;
        service.getKpForecast().subscribe((forecast) => (result = forecast));

        httpMock
            .expectOne(
                'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json',
            )
            .flush([
                {
                    time_tag: '2026-03-01T21:00:00',
                    kp: 7.33,
                    observed: 'predicted',
                    noaa_scale: 'G3',
                },
            ]);

        expect(result?.blocks).toEqual([{ start: new Date(Date.UTC(2026, 2, 1, 21)), kp: 7.33 }]);
    });
});
