import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { signal } from '@angular/core';
import { ClockStore } from '@data/stores/clock.store';
import { WasteStore } from '@data/stores/waste.store';
import { WasteReminder } from '@data/utils/waste';
import { TvWasteComponent } from './tv-waste.component';

describe('TvWasteComponent', () => {
    // Sunday 4 October 2026, 18:00
    const render = (reminders: WasteReminder[]): string[] => {
        TestBed.configureTestingModule({
            providers: [
                { provide: WasteStore, useValue: { reminders: signal(reminders) } },
                { provide: ClockStore, useValue: { now: signal(new Date(2026, 9, 4, 18)) } },
            ],
        });
        const fixture = TestBed.createComponent(TvWasteComponent);
        fixture.detectChanges();

        return [...fixture.nativeElement.querySelectorAll('.waste')].map(
            (line: HTMLElement) => line.textContent?.trim() ?? '',
        );
    };

    it('should name the bins that go out tonight, for tomorrow', () => {
        const lines = render([
            {
                action: 'out-tonight',
                pickups: [
                    { type: 'GREEN', date: '2026-10-05' },
                    { type: 'PAPER', date: '2026-10-05' },
                ],
            },
        ]);

        expect(lines).toEqual(['Out tonight: green bin (GFT) · paper']);
    });

    it('should say which day each bin is for, when one is for later', () => {
        const lines = render([
            {
                action: 'out-tonight',
                pickups: [
                    { type: 'GREY', date: '2026-10-05' },
                    { type: 'PLASTIC', date: '2026-10-06' },
                ],
            },
        ]);

        expect(lines).toEqual(['Out tonight: grey bin for Monday · plastic (PMD) for Tuesday']);
    });

    it('should put every reminder on a line of its own, in the same form', () => {
        const lines = render([
            { action: 'out-tonight', pickups: [{ type: 'PLASTIC', date: '2026-10-05' }] },
            { action: 'back-in', pickups: [{ type: 'GREY', date: '2026-10-04' }] },
        ]);

        expect(lines).toEqual(['Out tonight: plastic (PMD)', 'Back in: grey bin']);
    });

    it('should give a last call on the morning itself', () => {
        const lines = render([
            { action: 'out-now', pickups: [{ type: 'GREY', date: '2026-10-04' }] },
        ]);

        expect(lines).toEqual(['Out now: grey bin']);
    });

    it('should show nothing without a reminder', () => {
        expect(render([])).toEqual([]);
    });
});
