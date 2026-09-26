import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { environment } from '@environments/environment';
import { OpenMeteoAirQuality } from '@data/models/openmeteo-airquality.model';
import { OpenMeteoAirqualitySerializer } from '@data/serializers/openmeteo-airquality.serializer';

@Injectable({
    providedIn: 'root',
})
export class OpenMeteoAirqualityService extends HttpService<OpenMeteoAirQuality> {
    constructor() {
        super();
        this.setBaseUrl('https://air-quality-api.open-meteo.com/v1');
        this.setSerializer(new OpenMeteoAirqualitySerializer());
    }

    public getAirQuality(): Observable<OpenMeteoAirQuality> {
        this.setResource('/air-quality');

        const httpParams = {
            latitude: environment.open_meteo_lat,
            longitude: environment.open_meteo_lon,
            current:
                'alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen',
        };

        this.setParams(httpParams);

        return this.read();
    }
}
