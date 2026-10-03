import { ClockStore } from '@data/stores/clock.store';
import { RadioStore } from '@data/stores/radio.store';
import { WeatherStore } from '@data/stores/weather.store';
import { Component, computed, inject, input } from '@angular/core';
import { weatherCondition } from '@data/constants/weather-conditions';
import { IconComponent } from '@shared/components/icon/icon.component';
import { TvWasteComponent } from '../tv-waste/tv-waste.component';

// What's left on screen when nobody touched the remote for a while: dim, and calm enough
// to stay on all day with the music playing
@Component({
    selector: 'app-tv-ambient',
    templateUrl: './tv-ambient.component.html',
    styleUrl: './tv-ambient.component.scss',
    imports: [IconComponent, TvWasteComponent],
    host: {
        '[class.visible]': 'visible()',
        '[attr.aria-hidden]': '!visible()',
    },
})
export class TvAmbientComponent {
    private readonly clock = inject(ClockStore);
    private readonly weatherStore = inject(WeatherStore);

    public readonly radio = inject(RadioStore);
    public readonly visible = input(false);

    public readonly time = computed(() =>
        this.clock.now().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    );

    public readonly weather = computed(() => {
        const current = this.weatherStore.forecast()?.current_weather;

        if (!current) return undefined;

        const condition = weatherCondition(current.weathercode, !!current.is_day);

        return {
            icon: condition.icon,
            text: [`${current.temperature.toFixed()}°`, condition.description]
                .filter(Boolean)
                .join(' · '),
        };
    });
}
