import { of, throwError } from 'rxjs';
import { WeatherStore } from './weather.store';
import { TestBed } from '@angular/core/testing';
import { OpenMeteoService } from '@data/services/openmeteo.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { airQualityMock, forecastMock } from '@data/services/mocks/openmeteo.mock';

describe('WeatherStore', () => {
    const getForecast = vi.fn(() => of(forecastMock));
    const getAirQuality = vi.fn(() => of(airQualityMock));

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 2, 1, 12));
        getForecast.mockClear();
        getAirQuality.mockClear();

        TestBed.configureTestingModule({
            providers: [{ provide: OpenMeteoService, useValue: { getForecast, getAirQuality } }],
        });
    });

    afterEach(() => vi.useRealTimers());

    it('should fetch right away and every 5 minutes', () => {
        const store = TestBed.inject(WeatherStore);
        TestBed.tick();
        vi.advanceTimersByTime(0);

        expect(store.forecast()).toBe(forecastMock);
        expect(store.airQuality()).toBe(airQualityMock);

        vi.advanceTimersByTime(1000 * 60 * 5);

        expect(getForecast).toHaveBeenCalledTimes(2);
    });

    it('should show the weather when the pollen API does not answer', () => {
        getAirQuality.mockReturnValueOnce(throwError(() => new Error('timed out')));

        const store = TestBed.inject(WeatherStore);
        TestBed.tick();
        vi.advanceTimersByTime(0);
        expect(store.forecast()).toBe(forecastMock);
        expect(store.airQuality()).toBeUndefined();

        // The next time it answers, the pollen is back, and a later failure keeps it
        vi.advanceTimersByTime(1000 * 60 * 5);
        expect(store.airQuality()).toBe(airQualityMock);

        getAirQuality.mockReturnValueOnce(throwError(() => new Error('timed out')));
        vi.advanceTimersByTime(1000 * 60 * 5);
        expect(store.airQuality()).toBe(airQualityMock);
    });

    it('should keep polling after a failed request', () => {
        getForecast.mockReturnValueOnce(throwError(() => new Error('offline')));

        const store = TestBed.inject(WeatherStore);
        TestBed.tick();
        vi.advanceTimersByTime(0);
        expect(store.forecast()).toBeUndefined();

        vi.advanceTimersByTime(1000 * 60 * 5);
        expect(store.forecast()).toBe(forecastMock);
    });

    it('should derive the rain and the sun from the forecast and the time', () => {
        const store = TestBed.inject(WeatherStore);
        TestBed.tick();
        vi.advanceTimersByTime(0);

        expect(store.rain().map((slot) => slot.precipitation)).toEqual([0, 0.2, 0]);
        expect(store.sun()?.phase).toBe('day');
    });
});
