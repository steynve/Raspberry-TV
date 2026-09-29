import { AbstractModel } from './abstract.model';
import { OpenMeteoForecastDaily } from './openmeteo-forecast-daily.model';
import { OpenMeteoForecastHourly } from './openmeteo-forecast-hourly.model';
import { OpenMeteoForecastCurrent } from './openmeteo-forecast-current.model';
import { OpenMeteoForecastMinutely15 } from './openmeteo-forecast-minutely15.model';

export class OpenMeteoForecast extends AbstractModel {
    constructor(
        public current_weather: OpenMeteoForecastCurrent,
        public daily: OpenMeteoForecastDaily,
        public minutely_15: OpenMeteoForecastMinutely15,
        public hourly: OpenMeteoForecastHourly,
    ) {
        super();
        this.daily = new OpenMeteoForecastDaily(
            daily.time,
            daily.sunrise,
            daily.sunset,
            daily.weather_code,
            daily.temperature_2m_max,
            daily.temperature_2m_min,
            daily.precipitation_probability_max,
            daily.uv_index_max,
        );
        this.minutely_15 = new OpenMeteoForecastMinutely15(
            minutely_15.time,
            minutely_15.precipitation,
        );
        this.hourly = new OpenMeteoForecastHourly(
            hourly.time,
            hourly.precipitation,
            hourly.et0_fao_evapotranspiration,
            hourly.cloud_cover,
            hourly.wind_gusts_10m,
            hourly.precipitation_probability,
            hourly.cloud_cover_low,
            hourly.cloud_cover_mid,
            hourly.cloud_cover_high,
        );
    }
}
