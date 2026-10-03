import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { EMPTY, map, Observable, switchMap } from 'rxjs';
import { WastePickup, WasteType } from '@data/models/waste.model';

// Area Reiniging, which collects in Hoogeveen (also Emmen and Coevorden), on Ximmio's waste API. It
// answers browsers anywhere (CORS), so no key and no proxy. See github.com/xirixiz/homeassistant-afvalwijzer
// for the other collectors on it.
const API = 'https://wasteapi.ximmio.com/api';
const COMPANY = 'adc418da-d19b-11e5-ab30-625662870761'; // Area Reiniging

const DAYS_AHEAD = 60;

interface XimmioAddress {
    UniqueId: string;
    Community: string;
}

interface XimmioPickups {
    _pickupTypeText: string; // "GREY", "GREEN", "PAPER", "PLASTIC"
    pickupDates: string[]; // "2026-10-16T00:00:00"
}

const day = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const KNOWN: WasteType[] = ['GREY', 'GREEN', 'PAPER', 'PLASTIC'];

@Injectable({ providedIn: 'root' })
export class WasteService {
    private readonly http = inject(HttpClient);

    // The coming two months for the address in the environment, nothing without one
    public getPickups(now = new Date()): Observable<WastePickup[]> {
        const { waste_postcode: postCode, waste_house_number: number } = environment;

        if (!postCode || !number) return EMPTY;

        // "10A" is house number 10 with letter A
        const [, houseNumber = number.trim(), houseLetter = ''] =
            /^(\d+)\s*(.*)$/.exec(number.trim()) ?? [];

        return this.post<{ dataList: XimmioAddress[] }>('FetchAdress', {
            postCode: postCode.replace(/\s/g, '').toUpperCase(),
            houseNumber,
            ...(houseLetter ? { HouseLetter: houseLetter } : {}),
        }).pipe(
            switchMap(({ dataList }) => {
                const address = dataList?.[0];

                if (!address) return EMPTY;

                const end = new Date(now);
                end.setDate(end.getDate() + DAYS_AHEAD);

                return this.post<{ dataList: XimmioPickups[] }>('GetCalendar', {
                    uniqueAddressID: address.UniqueId,
                    community: address.Community,
                    startDate: day(now),
                    endDate: day(end),
                });
            }),
            map(({ dataList }) =>
                (dataList ?? [])
                    .filter((item) => KNOWN.includes(item._pickupTypeText as WasteType))
                    .flatMap((item) =>
                        item.pickupDates.map((date) => ({
                            type: item._pickupTypeText as WasteType,
                            date: date.slice(0, 10),
                        })),
                    ),
            ),
        );
    }

    // A form post, which browsers send without asking first (no CORS preflight)
    private post<T>(path: string, fields: Record<string, string>): Observable<T> {
        return this.http.post<T>(
            `${API}/${path}`,
            new HttpParams({ fromObject: { companyCode: COMPANY, ...fields } }),
        );
    }
}
