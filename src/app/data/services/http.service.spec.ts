import { HttpService } from './http.service';
import { Photos } from '../models/photos.model';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PhotosSerializer } from '../serializers/photos.serializer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

@Injectable({ providedIn: 'root' })
class TestHttpService extends HttpService<Photos> {
    constructor() {
        super();
        this.setBaseUrl('https://localhost/');
        this.setResource('resource');
        this.setSerializer(new PhotosSerializer());
    }
}

describe('HttpService', () => {
    let service: TestHttpService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });

        service = TestBed.inject(TestHttpService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    describe('read()', () => {
        it('should GET baseUrl + resource with headers and params and serialize the result', () => {
            service.setHeaders(new HttpHeaders({ foo: 'bar' }));
            service.setParams({ query: 'forest' });

            let result: Photos | undefined;
            service.read().subscribe((response) => (result = response));

            const request = httpMock.expectOne('https://localhost/resource?query=forest');
            expect(request.request.method).toBe('GET');
            expect(request.request.headers.get('foo')).toBe('bar');

            request.flush({ total_results: 1, page: 1, per_page: 1, photos: [], next_page: '' });

            expect(result).toBeInstanceOf(Photos);
            expect(result?.total_results).toBe(1);
        });

        it('should pass errors through catchError()', () => {
            vi.spyOn(service, 'catchError');
            const error = vi.fn();

            service.read().subscribe({ error });

            httpMock
                .expectOne('https://localhost/resource')
                .flush('', { status: 400, statusText: 'Bad Request' });

            expect(service.catchError).toHaveBeenCalled();
            expect(error).toHaveBeenCalled();
        });
    });
});
