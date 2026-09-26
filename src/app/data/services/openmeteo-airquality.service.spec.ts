import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OpenMeteoAirqualityService } from './openmeteo-airquality.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('OpenMeteoAirqualityService', () => {
    let service: OpenMeteoAirqualityService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });

        service = TestBed.inject(OpenMeteoAirqualityService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should request the current pollen levels for the configured location', () => {
        service.getAirQuality().subscribe();

        const request = httpMock.expectOne(
            (req) => req.url === 'https://air-quality-api.open-meteo.com/v1/air-quality',
        );

        expect(request.request.params.get('latitude')).toBe(environment.open_meteo_lat);
        expect(request.request.params.get('longitude')).toBe(environment.open_meteo_lon);
        expect(request.request.params.get('current')).toContain('birch_pollen');

        request.flush({ current: {} });
    });
});
