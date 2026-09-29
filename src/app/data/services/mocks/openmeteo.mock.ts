import { OpenMeteoForecast } from '../../models/openmeteo-forecast.model';
import { OpenMeteoAirQuality } from '../../models/openmeteo-airquality.model';
import { OpenMeteoForecastDaily } from '../../models/openmeteo-forecast-daily.model';
import { OpenMeteoForecastHourly } from '../../models/openmeteo-forecast-hourly.model';
import { OpenMeteoForecastCurrent } from '../../models/openmeteo-forecast-current.model';
import { OpenMeteoForecastMinutely15 } from '../../models/openmeteo-forecast-minutely15.model';
import { OpenMeteoAirQualityCurrent } from '../../models/openmeteo-airquality-current.model';

export const forecastDailyMock = new OpenMeteoForecastDaily(
    ['2026-03-01', '2026-03-02', '2026-03-03'],
    ['2026-03-01T07:00', '2026-03-02T06:58', '2026-03-03T06:56'],
    ['2026-03-01T18:30', '2026-03-02T18:32', '2026-03-03T18:34'],
    [2, 61, 0],
    [12.4, 9.6, 15.2],
    [4.2, 3.8, 6.1],
    [10, 80, 0],
    [6.4, 2.1, 4],
);

export const forecastMinutely15Mock = new OpenMeteoForecastMinutely15(
    ['2026-03-01T12:00', '2026-03-01T12:15', '2026-03-01T12:30'],
    [0, 0.2, 0],
);

// 2026-03-01 from 10:00 to 13:00: 6 mm of rain at 10:00, drying 0.5 mm per hour after that
export const forecastHourlyMock = new OpenMeteoForecastHourly(
    ['2026-03-01T10:00', '2026-03-01T11:00', '2026-03-01T12:00', '2026-03-01T13:00'],
    [6, 0, 0, 0],
    [0, 0.5, 0.5, 0.5],
    [100, 80, 10, 20],
    [40.4, 32.6, 28.1, 20],
    [90, 10, 0, 0],
    [100, 60, 5, 10],
    [80, 40, 0, 10],
    [20, 30, 10, 5],
);

// 12 °C, partly cloudy, wind from the south-west at 14 km/h
export const forecastMock = new OpenMeteoForecast(
    new OpenMeteoForecastCurrent('2026-03-01T12:00', 900, 12.4, 14.2, 225, 1, 2),
    forecastDailyMock,
    forecastMinutely15Mock,
    forecastHourlyMock,
);

// birch 25 → 4/10, mugwort 100 → above the highest threshold → 10/10
export const airQualityMock = new OpenMeteoAirQuality(
    new OpenMeteoAirQualityCurrent('2026-03-01T12:00', 3600, 0, 25, 0, 100, 0, 0),
);
