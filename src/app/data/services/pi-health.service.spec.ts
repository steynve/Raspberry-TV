import { TestBed } from '@angular/core/testing';
import { PiHealthService } from './pi-health.service';
import { provideHttpClient } from '@angular/common/http';
import { PiHealth } from '@data/models/pi-health.model';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { piHealthMock } from './mocks/pi-health.mock';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('PiHealthService', () => {
    let service: PiHealthService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(PiHealthService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should fetch health.json from the Pi itself, bypassing the browser cache', () => {
        let result: PiHealth | undefined;
        service.getHealth().subscribe((health) => (result = health));

        const request = httpMock.expectOne((req) => req.url === '/health.json');
        expect(request.request.params.get('t')).toMatch(/^\d+$/);

        request.flush({ ...piHealthMock() });

        expect(result).toEqual(piHealthMock());
    });
});
