import { describe, expect, it } from 'vitest';
import { forecastMock } from '../services/mocks/openmeteo.mock';
import { OpenMeteoForecast } from '../models/openmeteo-forecast.model';
import { OpenMeteoForecastSerializer } from './openmeteo-forecast.serializer';

describe('OpenMeteoForecastSerializer', () => {
    const serializer = new OpenMeteoForecastSerializer();
    const json = JSON.parse(JSON.stringify(forecastMock)) as OpenMeteoForecast;

    it('should serialize from json to model and derive the sun times', () => {
        const result = serializer.fromJson(json);

        expect(result).toBeInstanceOf(OpenMeteoForecast);
        expect(result.current_weather).toEqual(json.current_weather);
        expect(result.daily.sunriseToday).toBe('07:00');
        expect(result.daily.sunsetToday).toBe('18:30');
        expect(result.daily.sunriseTomorrow).toBe('06:58');
        expect(result.daily.sunriseTodayTimestamp).toBe(new Date('2026-03-01T07:00').getTime());
        expect(result.daily.temperature_2m_max).toEqual([12.4, 9.6, 15.2]);
        expect(result.minutely_15.precipitation).toEqual([0, 0.2, 0]);
        expect(result.hourly.cloud_cover).toEqual([100, 80, 10, 20]);
    });

    it('should serialize from model to json', () => {
        expect(serializer.toJson(forecastMock)).toEqual({
            current_weather: forecastMock.current_weather,
            daily: forecastMock.daily,
            minutely_15: forecastMock.minutely_15,
            hourly: forecastMock.hourly,
        });
    });
});
