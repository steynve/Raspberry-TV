import { RainSlot } from '@data/utils/rain';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { smoothLine, TvRainComponent } from './tv-rain.component';

describe('smoothLine()', () => {
    it('should curve through the midpoints between the points', () => {
        expect(
            smoothLine([
                [0, 30],
                [50, 10],
                [100, 30],
            ]),
        ).toBe('M 0 30 Q 50 10 75 20 L 100 30');
    });

    it('should return nothing for less than two points', () => {
        expect(smoothLine([[0, 30]])).toBe('');
    });
});

describe('TvRainComponent', () => {
    it('should render the summary, the chart and the time axis', () => {
        const slots: RainSlot[] = [0, 0, 0.3, 0.6, 0.3, 0, 0, 0, 0].map((precipitation, index) => ({
            time: new Date(2026, 2, 1, 12, index * 15),
            precipitation,
        }));
        const fixture = TestBed.createComponent(TvRainComponent);
        fixture.componentRef.setInput('slots', slots);
        fixture.detectChanges();

        const element: HTMLElement = fixture.nativeElement;

        expect(element.querySelector('.summary')?.textContent).toBe('Light rain from 12:30');
        expect(element.querySelector('.line')?.getAttribute('d')).toMatch(/^M 0 30 /);
        expect(element.querySelector('.area')?.getAttribute('d')).toMatch(/L 100 30 L 0 30 Z$/);
        expect(
            Array.from(element.querySelectorAll('.axis span')).map((span) => span.textContent),
        ).toEqual(['Now', '13:00', '14:00']);
    });
});
