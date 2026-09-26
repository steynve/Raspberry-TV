import { sunState } from './sun';
import { describe, expect, it } from 'vitest';
import { season, wallpaperMood, wallpaperQuery } from './wallpaper';
import { OpenMeteoForecast } from '@data/models/openmeteo-forecast.model';
import { forecastMock, forecastHourlyMock } from '@data/services/mocks/openmeteo.mock';
import { OpenMeteoForecastHourly } from '@data/models/openmeteo-forecast-hourly.model';
import { OpenMeteoForecastCurrent } from '@data/models/openmeteo-forecast-current.model';

describe('wallpaper', () => {
    const day = sunState(forecastMock.daily, new Date(2026, 2, 1, 12));
    const withCode = (code: number, hourly = forecastMock.hourly): OpenMeteoForecast =>
        new OpenMeteoForecast(
            new OpenMeteoForecastCurrent('2026-03-01T12:00', 900, 10, 10, 180, 1, code),
            forecastMock.daily,
            forecastMock.minutely_15,
            hourly,
        );

    it('should follow the weather', () => {
        expect(wallpaperMood(withCode(0), day)).toBe('sunny');
        expect(wallpaperMood(withCode(3), day)).toBe('default');
        expect(wallpaperMood(withCode(45), day)).toBe('fog');
        expect(wallpaperMood(withCode(61), day)).toBe('rain');
        expect(wallpaperMood(withCode(81), day)).toBe('rain');
        expect(wallpaperMood(withCode(73), day)).toBe('snow');
        expect(wallpaperMood(withCode(95), day)).toBe('storm');
    });

    it('should show the night sky after dark, unless the weather is more interesting', () => {
        const night = {
            ...sunState(forecastMock.daily, new Date(2026, 2, 1, 22)),
            night: { start: new Date(2026, 2, 1, 12), end: new Date(2026, 2, 1, 14) },
        };
        const cloudy = new OpenMeteoForecastHourly(
            forecastHourlyMock.time,
            forecastHourlyMock.precipitation,
            forecastHourlyMock.et0_fao_evapotranspiration,
            [100, 100, 100, 100],
            forecastHourlyMock.wind_gusts_10m,
        );

        // The mock's cloud cover between 12:00 and 14:00 is 15%
        expect(wallpaperMood(withCode(0), night)).toBe('clear-night');
        expect(wallpaperMood(withCode(3, cloudy), night)).toBe('night');
        expect(wallpaperMood(withCode(61), night)).toBe('rain');
    });

    it('should name the season', () => {
        expect(season(new Date(2026, 0, 15))).toBe('winter');
        expect(season(new Date(2026, 4, 15))).toBe('spring');
        expect(season(new Date(2026, 6, 15))).toBe('summer');
        expect(season(new Date(2026, 9, 15))).toBe('autumn');
    });

    it('should turn a mood into a photo search', () => {
        expect(wallpaperQuery('default', 'autumn')).toBe('autumn nature forest wallpaper');
        expect(wallpaperQuery('fog', 'winter')).toBe('misty winter forest landscape');
        expect(wallpaperQuery('clear-night', 'summer')).toBe('starry night sky mountains');
    });
});
