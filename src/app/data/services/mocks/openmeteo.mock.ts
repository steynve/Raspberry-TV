import {
    OpenMeteoAirQuality,
    OpenMeteoForecast,
    OpenMeteoForecastDaily,
    OpenMeteoForecastHourly,
    OpenMeteoForecastMinutely15,
} from '@data/models/openmeteo.model';

export const forecastDailyMock: OpenMeteoForecastDaily = {
    time: ['2026-03-01', '2026-03-02', '2026-03-03'],
    sunrise: ['2026-03-01T07:00', '2026-03-02T06:58', '2026-03-03T06:56'],
    sunset: ['2026-03-01T18:30', '2026-03-02T18:32', '2026-03-03T18:34'],
    weather_code: [2, 61, 0],
    temperature_2m_max: [12.4, 9.6, 15.2],
    temperature_2m_min: [4.2, 3.8, 6.1],
    precipitation_probability_max: [10, 80, 0],
    uv_index_max: [6.4, 2.1, 4],
};

export const forecastMinutely15Mock: OpenMeteoForecastMinutely15 = {
    time: ['2026-03-01T12:00', '2026-03-01T12:15', '2026-03-01T12:30'],
    precipitation: [0, 0.2, 0],
};

// 2026-03-01 from 10:00 to 13:00: 6 mm of rain at 10:00, drying 0.5 mm per hour after that
export const forecastHourlyMock: OpenMeteoForecastHourly = {
    time: ['2026-03-01T10:00', '2026-03-01T11:00', '2026-03-01T12:00', '2026-03-01T13:00'],
    precipitation: [6, 0, 0, 0],
    et0_fao_evapotranspiration: [0, 0.5, 0.5, 0.5],
    cloud_cover: [100, 80, 10, 20],
    wind_gusts_10m: [40.4, 32.6, 28.1, 20],
    precipitation_probability: [90, 10, 0, 0],
    cloud_cover_low: [100, 60, 5, 10],
    cloud_cover_mid: [80, 40, 0, 10],
    cloud_cover_high: [20, 30, 10, 5],
};

// 12 °C, partly cloudy, wind from the south-west at 14 km/h
export const forecastMock: OpenMeteoForecast = {
    current_weather: {
        time: '2026-03-01T12:00',
        temperature: 12.4,
        windspeed: 14.2,
        winddirection: 225,
        is_day: 1,
        weathercode: 2,
    },
    daily: forecastDailyMock,
    minutely_15: forecastMinutely15Mock,
    hourly: forecastHourlyMock,
};

// birch 25 → 4/10, mugwort 100 → above the highest threshold → 10/10
export const airQualityMock: OpenMeteoAirQuality = {
    current: {
        alder_pollen: 0,
        birch_pollen: 25,
        grass_pollen: 0,
        mugwort_pollen: 100,
        olive_pollen: 0,
        ragweed_pollen: 0,
    },
};
