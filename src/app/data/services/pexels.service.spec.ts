import { TestBed } from '@angular/core/testing';
import { PexelsService } from './pexels.service';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('PexelsService', () => {
    let service: PexelsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });

        service = TestBed.inject(PexelsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should search landscape photos with the API key', () => {
        service.getPhotos('query').subscribe();

        const request = httpMock.expectOne(
            'https://api.pexels.com/v1/search?query=query&orientation=landscape&per_page=60&size=large',
        );

        expect(request.request.headers.get('Authorization')).toBe(environment.pexels_api_key);

        request.flush({});
    });
});
