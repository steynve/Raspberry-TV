import { OpenMeteoForecast } from '@data/models/openmeteo-forecast.model';

export class OpenMeteoForecastSerializer {
    public fromJson(json: OpenMeteoForecast): OpenMeteoForecast {
        return new OpenMeteoForecast(
            json.current_weather,
            json.daily,
            json.minutely_15,
            json.hourly,
        );
    }

    public toJson(openMeteoForecast: OpenMeteoForecast): object {
        return {
            current_weather: openMeteoForecast.current_weather,
            daily: openMeteoForecast.daily,
            minutely_15: openMeteoForecast.minutely_15,
            hourly: openMeteoForecast.hourly,
        };
    }
}
