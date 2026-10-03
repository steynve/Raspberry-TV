import { map, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { KpBlock } from '@data/models/kp-forecast.model';

interface NoaaKpRow {
    time_tag: string; // UTC, without a zone designator
    kp: number;
}

@Injectable({ providedIn: 'root' })
export class NoaaService {
    private readonly http = inject(HttpClient);

    public getKpForecast(): Observable<KpBlock[]> {
        return this.http
            .get<NoaaKpRow[]>(
                'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json',
            )
            .pipe(
                map((rows) =>
                    rows.map(({ time_tag, kp }) => ({ start: new Date(`${time_tag}Z`), kp })),
                ),
            );
    }
}
