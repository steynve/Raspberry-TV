import { TestBed } from '@angular/core/testing';
import { WasteService } from './waste.service';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { WastePickup } from '@data/models/waste.model';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('WasteService', () => {
    let service: WasteService;
    let httpMock: HttpTestingController;
    const original = { ...environment };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(WasteService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
        Object.assign(environment, original);
    });

    const fields = (body: unknown): Record<string, string | null> => {
        const params = body as { keys(): string[]; get(key: string): string | null };
        return Object.fromEntries(params.keys().map((key) => [key, params.get(key)]));
    };

    it("should find the address, then read Area's calendar for two months", () => {
        Object.assign(environment, { waste_postcode: '7904 eh', waste_house_number: '10' });
        let pickups: WastePickup[] = [];
        service.getPickups(new Date(2026, 9, 4)).subscribe((result) => (pickups = result));

        const address = httpMock.expectOne('https://wasteapi.ximmio.com/api/FetchAdress');
        expect(fields(address.request.body)).toEqual({
            companyCode: 'adc418da-d19b-11e5-ab30-625662870761',
            postCode: '7904EH',
            houseNumber: '10',
        });
        address.flush({ dataList: [{ UniqueId: '1000003391', Community: 'Hoogeveen' }] });

        const calendar = httpMock.expectOne('https://wasteapi.ximmio.com/api/GetCalendar');
        expect(fields(calendar.request.body)).toEqual({
            companyCode: 'adc418da-d19b-11e5-ab30-625662870761',
            uniqueAddressID: '1000003391',
            community: 'Hoogeveen',
            startDate: '2026-10-04',
            endDate: '2026-12-03',
        });
        calendar.flush({
            dataList: [
                {
                    _pickupTypeText: 'GREEN',
                    pickupDates: ['2026-10-16T00:00:00', '2026-10-30T00:00:00'],
                },
                { _pickupTypeText: 'PAPER', pickupDates: ['2026-10-22T00:00:00'] },
                { _pickupTypeText: 'TEXTILE', pickupDates: ['2026-10-20T00:00:00'] },
            ],
        });

        expect(pickups).toEqual([
            { type: 'GREEN', date: '2026-10-16' },
            { type: 'GREEN', date: '2026-10-30' },
            { type: 'PAPER', date: '2026-10-22' },
        ]);
    });

    it('should pass a house letter on its own', () => {
        Object.assign(environment, { waste_postcode: '7904EH', waste_house_number: '10A' });
        service.getPickups().subscribe();

        const address = httpMock.expectOne('https://wasteapi.ximmio.com/api/FetchAdress');
        expect(fields(address.request.body)).toEqual(
            expect.objectContaining({ houseNumber: '10', HouseLetter: 'A' }),
        );
        address.flush({ dataList: [] });
    });

    it('should ask nothing without an address', () => {
        Object.assign(environment, { waste_postcode: '', waste_house_number: '' });
        let done = false;

        service.getPickups().subscribe({ complete: () => (done = true) });

        expect(done).toBe(true);
    });
});
