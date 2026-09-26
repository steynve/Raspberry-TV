import { Component, computed, input } from '@angular/core';
import { IconComponent } from '@shared/components/icon/icon.component';
import { OpenMeteoForecastDaily } from '@data/models/openmeteo-forecast-daily.model';
import { WeatherCondition, weatherCondition } from '@data/constants/weather-conditions';

export interface ForecastDay {
    date: string;
    label: string;
    condition: WeatherCondition;
    min: number;
    max: number;
    precipitationProbability: number;
    // Position of the day's temperature range within the whole week, in percentages
    rangeStart: number;
    rangeEnd: number;
}

@Component({
    selector: 'app-tv-forecast',
    templateUrl: './tv-forecast.component.html',
    styleUrl: './tv-forecast.component.scss',
    imports: [IconComponent],
})
export class TvForecastComponent {
    public readonly daily = input.required<OpenMeteoForecastDaily>();

    public readonly days = computed<ForecastDay[]>(() => {
        const daily = this.daily();
        const mins = daily.temperature_2m_min.map(Math.round);
        const maxes = daily.temperature_2m_max.map(Math.round);
        const weekMin = Math.min(...mins);
        const weekSpan = Math.max(...maxes) - weekMin || 1;

        return daily.time.map((date, index) => {
            const weekday = new Date(`${date}T00:00`).toLocaleDateString('en-GB', {
                weekday: 'short',
            });

            return {
                date,
                label: index === 0 ? 'Today' : weekday,
                condition: weatherCondition(daily.weather_code[index]),
                min: mins[index],
                max: maxes[index],
                precipitationProbability: daily.precipitation_probability_max[index] ?? 0,
                rangeStart: ((mins[index] - weekMin) / weekSpan) * 100,
                rangeEnd: ((maxes[index] - weekMin) / weekSpan) * 100,
            };
        });
    });
}
