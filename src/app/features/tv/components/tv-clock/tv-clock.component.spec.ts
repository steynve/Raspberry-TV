import { TvClockComponent } from './tv-clock.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('TvClockComponent', () => {
    let component: TvClockComponent;
    let fixture: ComponentFixture<TvClockComponent>;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 2, 1, 13, 37));

        fixture = TestBed.createComponent(TvClockComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => vi.useRealTimers());

    it('should set the date and time on init', () => {
        expect(component.date()).not.toEqual('');
        expect(component.time()).toEqual('13:37');
    });

    it('should update the time every second', () => {
        vi.advanceTimersByTime(1000 * 60);

        expect(component.time()).toEqual('13:38');
    });

    it('should render the date and time', () => {
        expect(fixture.nativeElement.querySelector('time').textContent).toContain('13:37');
    });
});
