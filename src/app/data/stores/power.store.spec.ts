import { TestBed } from '@angular/core/testing';
import { PowerStore } from './power.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('PowerStore', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should poll while awake, pause while asleep, and poll right away on waking', () => {
        const power = TestBed.inject(PowerStore);
        const ticks: number[] = [];
        power.poll(1000).subscribe(() => ticks.push(Date.now()));

        TestBed.tick();
        vi.advanceTimersByTime(2000);
        expect(ticks.length).toBe(3);

        power.sleep();
        TestBed.tick();
        vi.advanceTimersByTime(10000);
        expect(ticks.length).toBe(3);

        power.wake();
        TestBed.tick();
        vi.advanceTimersByTime(0);
        expect(ticks.length).toBe(4);
    });

    it('should know how long it has been asleep', () => {
        const power = TestBed.inject(PowerStore);
        expect(power.asleepFor()).toBe(0);

        power.sleep();
        vi.advanceTimersByTime(3000);
        power.sleep(); // the TV says so again
        vi.advanceTimersByTime(2000);
        expect(power.asleepFor()).toBe(5000);

        power.wake();
        expect(power.asleepFor()).toBe(0);
    });
});
