import { TestBed } from '@angular/core/testing';
import { OpenMeteoService } from './openmeteo.service';
import { forecastMock } from './mocks/openmeteo.mock';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('OpenMeteoService', () => {
    let service: OpenMeteoService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });

        service = TestBed.inject(OpenMeteoService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should request the forecast for the configured location', () => {
        service.getForecast().subscribe();

        const request = httpMock.expectOne(
            (req) => req.url === 'https://api.open-meteo.com/v1/forecast',
        );

        expect(request.request.params.get('latitude')).toBe(environment.open_meteo_lat);
        expect(request.request.params.get('longitude')).toBe(environment.open_meteo_lon);
        expect(request.request.params.get('daily')).toContain('temperature_2m_max');
        expect(request.request.params.get('minutely_15')).toBe('precipitation');
        expect(request.request.params.get('hourly')).toContain('et0_fao_evapotranspiration');
        expect(request.request.params.get('past_hours')).toBe('48');

        request.flush(JSON.parse(JSON.stringify(forecastMock)));
    });

    it('should request the pollen for the configured location', () => {
        service.getAirQuality().subscribe();

        const request = httpMock.expectOne(
            (req) => req.url === 'https://air-quality-api.open-meteo.com/v1/air-quality',
        );

        expect(request.request.params.get('latitude')).toBe(environment.open_meteo_lat);
        expect(request.request.params.get('current')).toContain('birch_pollen');

        request.flush({});
    });
});
