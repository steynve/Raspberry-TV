import { ClockStore } from './clock.store';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ClockStore', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 2, 1, 13, 37, 30));
    });

    afterEach(() => vi.useRealTimers());

    it('should only update when a new minute starts', () => {
        const clock = TestBed.inject(ClockStore);
        const first = clock.now();

        vi.advanceTimersByTime(1000 * 20);
        expect(clock.now()).toBe(first);

        vi.advanceTimersByTime(1000 * 10);
        expect(clock.now().getMinutes()).toBe(38);
    });
});
