// The parts of Open-Meteo's forecast and air quality APIs the app asks for, see OpenMeteoService

export interface OpenMeteoForecast {
    current_weather: OpenMeteoForecastCurrent;
    daily: OpenMeteoForecastDaily;
    minutely_15: OpenMeteoForecastMinutely15;
    hourly: OpenMeteoForecastHourly;
}

export interface OpenMeteoForecastCurrent {
    time: string;
    temperature: number;
    windspeed: number;
    winddirection: number;
    is_day: number;
    weathercode: number;
}

// Today first. Times are local, without a zone designator: "2026-03-01T07:00".
export interface OpenMeteoForecastDaily {
    time: string[];
    sunrise: string[];
    sunset: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    uv_index_max: number[];
}

export interface OpenMeteoForecastMinutely15 {
    time: string[];
    precipitation: number[];
}

// The last 48 hours and the next 24 hours. Sums and maximums are for the hour before their time
// (14:00 is the rain that fell from 13:00 to 14:00), cloud cover is at that moment.
export interface OpenMeteoForecastHourly {
    time: string[];
    precipitation: number[];
    et0_fao_evapotranspiration: number[];
    cloud_cover: number[];
    wind_gusts_10m: number[];
    precipitation_probability: number[];
    // Low clouds (up to 3 km) block the sunset, mid and high ones catch its colour
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
}

export interface OpenMeteoAirQuality {
    current: Record<PollenType, number>; // grains per m³
}

export type PollenType =
    | 'alder_pollen'
    | 'birch_pollen'
    | 'olive_pollen'
    | 'grass_pollen'
    | 'mugwort_pollen'
    | 'ragweed_pollen';
