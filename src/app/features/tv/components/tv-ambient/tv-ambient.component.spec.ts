import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ClockStore } from '@data/stores/clock.store';
import { RadioStore } from '@data/stores/radio.store';
import { WeatherStore } from '@data/stores/weather.store';
import { WasteStore } from '@data/stores/waste.store';
import { TvAmbientComponent } from './tv-ambient.component';
import { forecastMock } from '@data/services/mocks/openmeteo.mock';
import { radioStoreMock, RadioStoreMock } from '@data/services/mocks/radio-store.mock';

describe('TvAmbientComponent', () => {
    let radio: RadioStoreMock;

    beforeEach(() => {
        radio = radioStoreMock();
        TestBed.configureTestingModule({
            providers: [
                { provide: ClockStore, useValue: { now: signal(new Date(2026, 2, 1, 21, 7)) } },
                { provide: WeatherStore, useValue: { forecast: signal(forecastMock) } },
                { provide: RadioStore, useValue: radio },
                { provide: WasteStore, useValue: { reminders: signal([]) } },
            ],
        });
    });

    const render = (visible = true): HTMLElement => {
        const fixture = TestBed.createComponent(TvAmbientComponent);
        fixture.componentRef.setInput('visible', visible);
        fixture.detectChanges();

        return fixture.nativeElement;
    };

    it('should show the time, the song and the weather', () => {
        radio.song.set('Hedonism');
        radio.artist.set('Skunk Anansie');
        const element = render();

        expect(element.querySelector('.time')?.textContent).toBe('21:07');
        expect(element.querySelector('.song')?.textContent).toBe('Hedonism');
        expect(element.querySelector('.meta')?.textContent?.trim()).toBe('Skunk Anansie · KINK');
        expect(element.querySelector('.playing-icon')?.classList).toContain('active');
        expect(element.querySelector('.weather')?.textContent?.trim()).toBe('12° · Partly cloudy');
    });

    it('should show the station when the song is unknown', () => {
        radio.channelIndex.set(2);

        expect(render().querySelector('.song')?.textContent).toBe('Reggae');
    });

    it('should show the cover instead of the playing icon', () => {
        radio.channelIndex.set(0);
        radio.song.set('Everlong');
        radio.cover.set('https://i.scdn.co/image/cover');
        const element = render();

        expect(element.querySelector('img.cover')?.getAttribute('src')).toBe(
            'https://i.scdn.co/image/cover',
        );
        expect(element.querySelector('.playing-icon')).toBeNull();
    });

    it('should only be visible when idle', () => {
        const hidden = render(false);

        expect(hidden.classList).not.toContain('visible');
        expect(hidden.getAttribute('aria-hidden')).toBe('true');
    });
});
