import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TvForecastComponent } from './tv-forecast.component';
import { forecastDailyMock } from '@data/services/mocks/openmeteo.mock';

describe('TvForecastComponent', () => {
    const createComponent = (): { component: TvForecastComponent; element: HTMLElement } => {
        const fixture = TestBed.createComponent(TvForecastComponent);
        fixture.componentRef.setInput('daily', forecastDailyMock);
        fixture.detectChanges();

        return { component: fixture.componentInstance, element: fixture.nativeElement };
    };

    it('should list every day, starting with today', () => {
        const { component } = createComponent();

        expect(component.days().map((day) => day.label)).toEqual(['Today', 'Mon', 'Tue']);
        expect(component.days()[1].condition).toEqual({
            description: 'Light rain',
            icon: 'cloud-rain',
        });
    });

    it("should position each day's range within the week's temperatures", () => {
        const { component } = createComponent();
        // Rounded: the week runs from 4° to 15°
        const [today, , warmest] = component.days();

        expect(today.rangeStart).toBe(0);
        expect(today.rangeEnd).toBeCloseTo((8 / 11) * 100);
        expect(warmest.rangeEnd).toBe(100);
    });

    it('should only highlight a likely chance of rain', () => {
        const { element } = createComponent();
        const rain = element.querySelectorAll('.day-rain');

        expect(rain[0].classList).not.toContain('likely');
        expect(rain[1].classList).toContain('likely');
        expect(rain[1].textContent?.trim()).toBe('80%');
    });

    it('should pass the range to CSS', () => {
        const { element } = createComponent();
        const day = element.querySelector<HTMLElement>('.day')!;

        expect(day.style.getPropertyValue('--range-start')).toBe('0%');
    });
});
