import { describe, expect, it } from 'vitest';
import { OpenMeteoForecast } from '../models/openmeteo-forecast.model';
import { OpenMeteoForecastSerializer } from './openmeteo-forecast.serializer';

describe('OpenMeteoForecastSerializer', () => {
    const serializer = new OpenMeteoForecastSerializer();
    const json = {
        current_weather: { temperature: 12.4, weathercode: 2, is_day: 1 },
        daily: {
            sunrise: ['2026-03-01T07:00', '2026-03-02T06:58'],
            sunset: ['2026-03-01T18:30', '2026-03-02T18:32'],
        },
    } as unknown as OpenMeteoForecast;

    it('should serialize from json to model and derive the sun times', () => {
        const result = serializer.fromJson(json);

        expect(result).toBeInstanceOf(OpenMeteoForecast);
        expect(result.current_weather).toEqual(json.current_weather);
        expect(result.daily.sunriseToday).toBe('07:00');
        expect(result.daily.sunsetToday).toBe('18:30');
        expect(result.daily.sunriseTomorrow).toBe('06:58');
        expect(result.daily.sunriseTodayTimestamp).toBe(new Date('2026-03-01T07:00').getTime());
    });

    it('should serialize from model to json', () => {
        const result = serializer.toJson(serializer.fromJson(json));

        expect(result).toEqual({
            current_weather: json.current_weather,
            daily: expect.objectContaining(json.daily),
        });
    });
});
