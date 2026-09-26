import { ClockStore } from '@data/stores/clock.store';
import { Component, computed, inject } from '@angular/core';
import { PiHealthStore } from '@data/stores/pi-health.store';
import { formatUptime, memoryUsed, minutesSince, throttledState } from '@data/utils/pi';

interface SystemRow {
    label: string;
    value: string;
    warning?: boolean;
}

const unknown = '–';

// The Raspberry Pi's health, in the channel list sheet
@Component({
    selector: 'app-tv-system',
    templateUrl: './tv-system.component.html',
    styleUrl: './tv-system.component.scss',
})
export class TvSystemComponent {
    private readonly clock = inject(ClockStore);
    private readonly piHealthStore = inject(PiHealthStore);

    public readonly health = this.piHealthStore.health;

    public readonly rows = computed<SystemRow[]>(() => {
        const health = this.health();

        if (!health) return [];

        const minutesAgo = minutesSince(health, this.clock.now());
        const memory = memoryUsed(health);
        const state = throttledState(health.throttled);

        return [
            {
                label: 'Temperature',
                value:
                    health.temperature === null ? unknown : `${health.temperature.toFixed(1)} °C`,
                warning: (health.temperature ?? 0) >= 75,
            },
            {
                label: 'Load',
                value: health.load === null ? unknown : health.load.toFixed(2),
                warning: (health.load ?? 0) >= 4, // all four cores busy
            },
            {
                label: 'Memory',
                value:
                    memory === undefined
                        ? unknown
                        : `${Math.round(memory * 100)}% of ${Math.round((health.memoryTotal ?? 0) / 1024)} MB`,
                warning: (memory ?? 0) >= 0.9,
            },
            {
                label: 'Storage',
                value: health.disk === null ? unknown : `${health.disk}%`,
                warning: health.disk !== null && health.disk >= 90,
            },
            {
                label: 'Power',
                value: !state
                    ? unknown
                    : state.underVoltage
                      ? 'Under-voltage'
                      : state.underVoltageOccurred
                        ? 'Had under-voltage'
                        : 'Stable',
                warning: !!state?.underVoltage,
            },
            {
                label: 'Up for',
                value: health.uptime === null ? unknown : formatUptime(health.uptime),
            },
            {
                label: 'Updated',
                value: minutesAgo ? `${minutesAgo} min ago` : 'Just now',
                warning: minutesAgo >= 5,
            },
        ];
    });
}
