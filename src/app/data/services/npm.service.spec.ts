import { TestBed } from '@angular/core/testing';
import { NpmService } from './npm.service';
import { Npm } from '@data/models/npm.model';
import { provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('NpmService', () => {
    let service: NpmService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });

        service = TestBed.inject(NpmService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should request the package details and map the dist-tags', () => {
        let result: Npm | undefined;

        service.getDetails('@angular/core').subscribe((response) => (result = response));

        httpMock
            .expectOne('https://registry.npmjs.org/@angular/core')
            .flush({ name: '@angular/core', 'dist-tags': { latest: '22.2.0' } });

        expect(result?.distTags?.latest).toBe('22.2.0');
    });
});
