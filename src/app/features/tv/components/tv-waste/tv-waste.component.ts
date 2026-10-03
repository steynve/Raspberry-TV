import { Component, computed, inject } from '@angular/core';
import { ClockStore } from '@data/stores/clock.store';
import { WasteStore } from '@data/stores/waste.store';
import { WasteReminder } from '@data/utils/waste';
import { WastePickup, WasteType } from '@data/models/waste.model';
import { IconComponent } from '@shared/components/icon/icon.component';

// As the bins are called in Hoogeveen: GFT and PMD are what everyone says
const LABELS: Record<WasteType, string> = {
    GREY: 'grey bin',
    GREEN: 'green bin (GFT)',
    PAPER: 'paper',
    PLASTIC: 'plastic (PMD)',
};

// What to do, then with which bins: "Out tonight: grey bin", "Out now: …", "Back in: …"
const ACTIONS: Record<WasteReminder['action'], string> = {
    'out-tonight': 'Out tonight',
    'out-now': 'Out now',
    'back-in': 'Back in',
};

// "Monday", for a date like "2026-10-05"
const weekday = (date: string): string =>
    new Date(`${date}T12:00`).toLocaleDateString('en-GB', { weekday: 'long' });

// Which bins go out or come back in, under the clock and on the idle screen (see wasteReminders)
@Component({
    selector: 'app-tv-waste',
    templateUrl: './tv-waste.component.html',
    styleUrl: './tv-waste.component.scss',
    imports: [IconComponent],
})
export class TvWasteComponent {
    private readonly reminders = inject(WasteStore).reminders;
    private readonly clock = inject(ClockStore);

    public readonly lines = computed(() =>
        this.reminders().map(
            ({ action, pickups }) => `${ACTIONS[action]}: ${this.names(action, pickups)}`,
        ),
    );

    // The day each bin is for, when tonight's are not all for tomorrow: "grey bin for Monday ·
    // plastic (PMD) for Tuesday"
    private names(action: WasteReminder['action'], pickups: WastePickup[]): string {
        const tomorrow = new Date(this.clock.now());
        tomorrow.setDate(tomorrow.getDate() + 1);
        const later =
            action === 'out-tonight' &&
            pickups.some((pickup) => pickup.date !== tomorrow.toLocaleDateString('sv-SE'));

        return pickups
            .map((pickup) => LABELS[pickup.type] + (later ? ` for ${weekday(pickup.date)}` : ''))
            .join(' · ');
    }
}
