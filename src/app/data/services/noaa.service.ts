import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { KpForecast } from '@data/models/kp-forecast.model';
import { KpForecastSerializer } from '@data/serializers/kp-forecast.serializer';

@Injectable({
    providedIn: 'root',
})
export class NoaaService extends HttpService<KpForecast> {
    constructor() {
        super();

        this.setBaseUrl('https://services.swpc.noaa.gov/products');
        this.setSerializer(new KpForecastSerializer());
    }

    public getKpForecast(): Observable<KpForecast> {
        this.setResource('/noaa-planetary-k-index-forecast.json');
        return this.read();
    }
}
