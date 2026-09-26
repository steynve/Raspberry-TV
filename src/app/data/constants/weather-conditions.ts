import { IconName } from '@shared/components/icon/icon-name.type';

export interface WeatherCondition {
    description: string;
    icon: IconName;
}

const condition = (
    description: string,
    icon: IconName,
    nightIcon: IconName = icon,
): { day: WeatherCondition; night: WeatherCondition } => ({
    day: { description, icon },
    night: { description, icon: nightIcon },
});

// WMO weather interpretation codes, as used by Open-Meteo
export const WEATHER_CONDITIONS: Record<
    number,
    { day: WeatherCondition; night: WeatherCondition }
> = {
    0: {
        day: { description: 'Sunny', icon: 'sun' },
        night: { description: 'Clear', icon: 'moon' },
    },
    1: {
        day: { description: 'Mostly sunny', icon: 'sun' },
        night: { description: 'Mostly clear', icon: 'moon' },
    },
    2: condition('Partly cloudy', 'cloud-sun', 'cloud-moon'),
    3: condition('Cloudy', 'cloud'),
    45: condition('Fog', 'cloud-fog'),
    48: condition('Freezing fog', 'cloud-fog'),
    51: condition('Light drizzle', 'cloud-drizzle'),
    53: condition('Drizzle', 'cloud-drizzle'),
    55: condition('Heavy drizzle', 'cloud-drizzle'),
    56: condition('Light freezing drizzle', 'cloud-drizzle'),
    57: condition('Freezing drizzle', 'cloud-drizzle'),
    61: condition('Light rain', 'cloud-rain'),
    63: condition('Rain', 'cloud-rain'),
    65: condition('Heavy rain', 'cloud-rain'),
    66: condition('Light freezing rain', 'cloud-rain'),
    67: condition('Freezing rain', 'cloud-rain'),
    71: condition('Light snow', 'cloud-snow'),
    73: condition('Snow', 'cloud-snow'),
    75: condition('Heavy snow', 'cloud-snow'),
    77: condition('Snow grains', 'snowflake'),
    80: condition('Light showers', 'cloud-sun-rain', 'cloud-moon-rain'),
    81: condition('Showers', 'cloud-rain'),
    82: condition('Heavy showers', 'cloud-rain-wind'),
    85: condition('Light snow showers', 'cloud-snow'),
    86: condition('Snow showers', 'cloud-snow'),
    95: condition('Thunderstorm', 'cloud-lightning'),
    96: condition('Thunderstorm with hail', 'cloud-hail'),
    99: condition('Severe thunderstorm with hail', 'cloud-hail'),
};

export const weatherCondition = (code: number, isDay = true): WeatherCondition =>
    WEATHER_CONDITIONS[code]?.[isDay ? 'day' : 'night'] ?? { description: '', icon: 'cloud' };
