import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { OpenMeteoAirQuality, OpenMeteoForecast } from '@data/models/openmeteo.model';

const LOCATION = { latitude: environment.open_meteo_lat, longitude: environment.open_meteo_lon };

@Injectable({ providedIn: 'root' })
export class OpenMeteoService {
    private readonly http = inject(HttpClient);

    public getForecast(): Observable<OpenMeteoForecast> {
        return this.http.get<OpenMeteoForecast>('https://api.open-meteo.com/v1/forecast', {
            params: {
                ...LOCATION,
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
            },
        });
    }

    public getAirQuality(): Observable<OpenMeteoAirQuality> {
        return this.http.get<OpenMeteoAirQuality>(
            'https://air-quality-api.open-meteo.com/v1/air-quality',
            {
                params: {
                    ...LOCATION,
                    current:
                        'alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen',
                },
            },
        );
    }
}
