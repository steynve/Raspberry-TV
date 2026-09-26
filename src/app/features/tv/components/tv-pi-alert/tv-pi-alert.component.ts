import { Component, inject } from '@angular/core';
import { PiHealthStore } from '@data/stores/pi-health.store';
import { IconComponent } from '@shared/components/icon/icon.component';

// Only shows up when something is wrong with the Pi
@Component({
    selector: 'app-tv-pi-alert',
    templateUrl: './tv-pi-alert.component.html',
    styleUrl: './tv-pi-alert.component.scss',
    imports: [IconComponent],
})
export class TvPiAlertComponent {
    public readonly alerts = inject(PiHealthStore).alerts;
}
