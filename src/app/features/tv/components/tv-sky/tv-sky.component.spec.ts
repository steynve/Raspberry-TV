import { signal } from '@angular/core';
import { sunState } from '@data/utils/sun';
import { moonPhase } from '@data/utils/moon';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TvSkyComponent } from './tv-sky.component';
import { ClockStore } from '@data/stores/clock.store';
import { WeatherStore } from '@data/stores/weather.store';
import { AuroraStore } from '@data/stores/aurora.store';
import { KpForecast } from '@data/models/kp-forecast.model';
import { forecastMock } from '@data/services/mocks/openmeteo.mock';

describe('TvSkyComponent', () => {
    // Kp 7.33 from 21:00 until midnight local time
    const aurora = new KpForecast([{ start: new Date(2026, 2, 1, 21), kp: 7.33 }]);

    const sky = (element: HTMLElement): string | undefined =>
        element.querySelector('.sky')?.textContent?.trim();

    const render = (now: Date, kp: KpForecast = new KpForecast([])): HTMLElement => {
        TestBed.configureTestingModule({
            providers: [
                { provide: AuroraStore, useValue: { forecast: signal(kp) } },
                { provide: ClockStore, useValue: { now: signal(now) } },
                {
                    provide: WeatherStore,
                    useValue: {
                        forecast: signal(forecastMock),
                        sun: signal(sunState(forecastMock.daily, now)),
                    },
                },
            ],
        });

        const fixture = TestBed.createComponent(TvSkyComponent);
        fixture.detectChanges();

        return fixture.nativeElement;
    };

    it('should show the daylight left during the day', () => {
        const element = render(new Date(2026, 2, 1, 12));

        expect(sky(element)).toBe('6h 30m of daylight left · sunset 18:30');
        expect(element.querySelector('app-icon.sun')).toBeTruthy();
    });

    it('should announce the golden hour', () => {
        const element = render(new Date(2026, 2, 1, 18, 5));

        expect(sky(element)).toBe('Golden hour · sunset 18:30, in 25m');
        expect(element.querySelector('app-icon.golden')).toBeTruthy();
    });

    it('should show the moon and the sunrise at night', () => {
        // The mock has no cloud cover for that night, so the sky is left out
        const now = new Date(2026, 2, 1, 22);
        const moon = moonPhase(now);
        const element = render(now);

        expect(element.querySelector('svg.moon')).toBeTruthy();
        expect(sky(element)).toBe(
            `${moon.name} ${Math.round(moon.illumination * 100)}% · sunrise 06:58`,
        );
    });

    it('should highlight a chance of northern lights tonight', () => {
        expect(
            render(new Date(2026, 2, 1, 22), aurora)
                .querySelector('.aurora')
                ?.textContent?.trim(),
        ).toBe('Northern lights possible · Kp 7');
    });

    it('should announce the northern lights during the day for the coming night', () => {
        expect(
            render(new Date(2026, 2, 1, 12), aurora)
                .querySelector('.aurora')
                ?.textContent?.trim(),
        ).toBe('Northern lights possible tonight · Kp 7');
    });

    it('should say how fast the days change, during the day', () => {
        // The mock's days are 11h 30m and 11h 34m
        expect(
            render(new Date(2026, 2, 1, 12))
                .querySelector('.sky-notes')
                ?.textContent?.trim(),
        ).toBe('Gaining 4 min of daylight a day');
    });

    it('should leave out the notes when there is nothing to note', () => {
        // The mock has no forecast for sunset or the night
        expect(render(new Date(2026, 2, 1, 18, 5)).querySelector('.sky-notes')).toBeNull();
    });

    it('should stay quiet about a quiet sky', () => {
        expect(render(new Date(2026, 2, 1, 22)).querySelector('.aurora')).toBeNull();
    });

    it('should describe the night sky from the cloud cover', () => {
        // 12:00 is "night" for this check only because the sun state says so
        TestBed.configureTestingModule({
            providers: [
                { provide: AuroraStore, useValue: { forecast: signal(undefined) } },
                { provide: ClockStore, useValue: { now: signal(new Date(2026, 2, 1, 12)) } },
                {
                    provide: WeatherStore,
                    useValue: {
                        forecast: signal(forecastMock),
                        sun: signal({
                            ...sunState(forecastMock.daily, new Date(2026, 2, 1, 22)),
                            night: {
                                start: new Date(2026, 2, 1, 12),
                                end: new Date(2026, 2, 1, 14),
                            },
                        }),
                    },
                },
            ],
        });

        const fixture = TestBed.createComponent(TvSkyComponent);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('clear night');
    });
});
