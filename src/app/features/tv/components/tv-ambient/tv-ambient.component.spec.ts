import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ClockStore } from '@data/stores/clock.store';
import { WeatherStore } from '@data/stores/weather.store';
import { TvAmbientComponent } from './tv-ambient.component';
import { forecastMock } from '@data/services/mocks/openmeteo.mock';

describe('TvAmbientComponent', () => {
    const render = (inputs: Record<string, unknown>): HTMLElement => {
        TestBed.configureTestingModule({
            providers: [
                { provide: ClockStore, useValue: { now: signal(new Date(2026, 2, 1, 21, 7)) } },
                { provide: WeatherStore, useValue: { forecast: signal(forecastMock) } },
            ],
        });

        const fixture = TestBed.createComponent(TvAmbientComponent);
        Object.entries(inputs).forEach(([name, value]) =>
            fixture.componentRef.setInput(name, value),
        );
        fixture.detectChanges();

        return fixture.nativeElement;
    };

    it('should show the time, the song and the weather', () => {
        const element = render({
            visible: true,
            song: 'Hedonism',
            artist: 'Skunk Anansie',
            station: '<i>K</i>INK',
            playing: true,
        });

        expect(element.querySelector('.time')?.textContent).toBe('21:07');
        expect(element.querySelector('.song')?.textContent).toBe('Hedonism');
        expect(element.querySelector('.meta')?.textContent?.trim()).toBe('Skunk Anansie · KINK');
        expect(element.querySelector('.playing-icon')?.classList).toContain('active');
        expect(element.querySelector('.weather')?.textContent?.trim()).toBe('12° · Partly cloudy');
    });

    it('should show the station when the song is unknown', () => {
        const element = render({ visible: true, station: 'Reggae' });

        expect(element.querySelector('.song')?.textContent).toBe('Reggae');
    });

    it('should only be visible when idle', () => {
        const hidden = render({ visible: false });

        expect(hidden.classList).not.toContain('visible');
        expect(hidden.getAttribute('aria-hidden')).toBe('true');
    });
});
