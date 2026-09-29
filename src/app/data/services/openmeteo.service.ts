import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { environment } from '@environments/environment';
import { OpenMeteoForecast } from '@data/models/openmeteo-forecast.model';
import { OpenMeteoForecastSerializer } from '@data/serializers/openmeteo-forecast.serializer';

@Injectable({
    providedIn: 'root',
})
export class OpenMeteoService extends HttpService<OpenMeteoForecast> {
    constructor() {
        super();

        this.setBaseUrl('https://api.open-meteo.com/v1');
        this.setSerializer(new OpenMeteoForecastSerializer());
    }

    public getForecast(): Observable<OpenMeteoForecast> {
        this.setResource('/forecast');

        const httpParams = {
            latitude: environment.open_meteo_lat,
            longitude: environment.open_meteo_lon,
            current_weather: true,
            daily: 'sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max',
            minutely_15: 'precipitation',
            forecast_minutely_15: 10,
            hourly: [
                'precipitation',
                'et0_fao_evapotranspiration',
                'cloud_cover',
                'wind_gusts_10m',
                'precipitation_probability',
                'cloud_cover_low',
                'cloud_cover_mid',
                'cloud_cover_high',
            ].join(','),
            past_hours: 48,
            forecast_hours: 24,
            forecast_days: 5,
            timezone: 'Europe/Amsterdam',
        };

        this.setParams(httpParams);

        return this.read();
    }
}
