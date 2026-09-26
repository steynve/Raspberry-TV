import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PiHealthStore } from './pi-health.store';
import { ClockStore } from '@data/stores/clock.store';
import { PiHealthService } from '@data/services/pi-health.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { piHealthMock } from '@data/services/mocks/pi-health.mock';

describe('PiHealthStore', () => {
    const now = signal(new Date(2026, 2, 1, 12, 0, 30));
    const getHealth = vi.fn(() => of(piHealthMock({ temperature: 80 })));

    beforeEach(() => {
        vi.useFakeTimers();
        getHealth.mockClear();
        TestBed.configureTestingModule({
            providers: [
                { provide: ClockStore, useValue: { now } },
                { provide: PiHealthService, useValue: { getHealth } },
            ],
        });
    });

    afterEach(() => vi.useRealTimers());

    it('should poll every minute and derive the alerts', () => {
        const store = TestBed.inject(PiHealthStore);
        TestBed.tick();
        vi.advanceTimersByTime(0);

        expect(store.alerts()).toEqual(['80 °C']);

        vi.advanceTimersByTime(1000 * 60);
        expect(getHealth).toHaveBeenCalledTimes(2);
    });

    it('should keep the last measurement when a request fails, so it turns stale', () => {
        const store = TestBed.inject(PiHealthStore);
        TestBed.tick();
        vi.advanceTimersByTime(0);

        getHealth.mockReturnValue(throwError(() => new Error('404')));
        vi.advanceTimersByTime(1000 * 60 * 10);
        now.set(new Date(2026, 2, 1, 12, 10));

        expect(store.health()?.temperature).toBe(80);
        expect(store.alerts()).toEqual(['No measurement for 10 min', '80 °C']);
    });
});
