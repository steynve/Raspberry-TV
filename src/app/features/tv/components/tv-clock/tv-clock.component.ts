import { ClockStore } from '@data/stores/clock.store';
import { Component, computed, inject } from '@angular/core';

@Component({
    selector: 'app-tv-clock',
    templateUrl: './tv-clock.component.html',
    styleUrl: './tv-clock.component.scss',
})
export class TvClockComponent {
    private readonly clock = inject(ClockStore);

    public readonly date = computed(() =>
        this.clock.now().toLocaleString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        }),
    );

    public readonly time = computed(() =>
        this.clock.now().toLocaleString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        }),
    );
}
