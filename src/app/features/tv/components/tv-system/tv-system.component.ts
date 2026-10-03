import { Component, computed, inject } from '@angular/core';
import { PiHealthStore } from '@data/stores/pi-health.store';
import { formatUptime, FULL, HOT, memoryUsed } from '@data/utils/pi';

interface SystemRow {
    label: string;
    value: string;
    warning?: boolean;
}

const unknown = '–';

// The Raspberry Pi's health, in the channel list sheet. Power and missed measurements only show up
// when something's wrong, in the alert on the dashboard (see TvPiAlertComponent).
@Component({
    selector: 'app-tv-system',
    templateUrl: './tv-system.component.html',
    styleUrl: './tv-system.component.scss',
})
export class TvSystemComponent {
    public readonly health = inject(PiHealthStore).health;

    public readonly rows = computed<SystemRow[]>(() => {
        const health = this.health();

        if (!health) return [];

        const memory = memoryUsed(health);

        return [
            {
                label: 'Temperature',
                value:
                    health.temperature === null ? unknown : `${health.temperature.toFixed(1)} °C`,
                warning: (health.temperature ?? 0) >= HOT,
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
                warning: (memory ?? 0) >= FULL,
            },
            {
                label: 'Storage',
                value: health.disk === null ? unknown : `${health.disk}%`,
                warning: (health.disk ?? 0) >= FULL * 100,
            },
            {
                label: 'Up for',
                value: health.uptime === null ? unknown : formatUptime(health.uptime),
            },
        ];
    });
}
