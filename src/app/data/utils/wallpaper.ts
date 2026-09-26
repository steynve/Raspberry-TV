import { SunState } from './sun';
import { averageCloudCover } from './outdoors';
import { OpenMeteoForecast } from '@data/models/openmeteo-forecast.model';

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export type WallpaperMood =
    'storm' | 'snow' | 'rain' | 'fog' | 'clear-night' | 'night' | 'sunny' | 'default';

export const season = (date: Date): Season =>
    (['winter', 'spring', 'summer', 'autumn'] as const)[Math.floor((date.getMonth() / 12) * 4) % 4];

// The weather decides first, then the time of day: a rainy evening is still a rainy photo
export const wallpaperMood = (forecast: OpenMeteoForecast, sun: SunState): WallpaperMood => {
    const code = forecast.current_weather.weathercode;

    if (code >= 95) return 'storm';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if (code === 45 || code === 48) return 'fog';

    if (sun.phase === 'night') {
        const cloudCover = averageCloudCover(forecast.hourly, sun.night.start, sun.night.end);

        return cloudCover !== undefined && cloudCover < 25 ? 'clear-night' : 'night';
    }

    return code <= 1 ? 'sunny' : 'default';
};

export const wallpaperQuery = (mood: WallpaperMood, currentSeason: Season): string =>
    ({
        storm: 'dramatic storm clouds landscape',
        snow: 'snowy forest',
        rain: 'rainy forest landscape',
        fog: `misty ${currentSeason} forest landscape`,
        'clear-night': 'starry night sky mountains',
        night: 'forest at night',
        sunny: `sunny ${currentSeason} forest`,
        default: `${currentSeason} nature forest wallpaper`,
    })[mood];
