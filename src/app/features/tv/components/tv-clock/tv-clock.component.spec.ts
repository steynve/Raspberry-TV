import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ClockStore } from '@data/stores/clock.store';
import { TvClockComponent } from './tv-clock.component';

describe('TvClockComponent', () => {
    it('should render the date and time from the clock', () => {
        const now = signal(new Date(2026, 2, 1, 13, 37));
        TestBed.configureTestingModule({ providers: [{ provide: ClockStore, useValue: { now } }] });

        const fixture = TestBed.createComponent(TvClockComponent);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.date').textContent).toBe('Sunday 1 March');
        expect(fixture.nativeElement.querySelector('.time').textContent).toBe('13:37');

        now.set(new Date(2026, 2, 1, 13, 38));
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.time').textContent).toBe('13:38');
    });
});
