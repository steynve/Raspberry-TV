import { of, throwError } from 'rxjs';
import { AuroraStore } from './aurora.store';
import { TestBed } from '@angular/core/testing';
import { NoaaService } from '@data/services/noaa.service';
import { KpForecast } from '@data/models/kp-forecast.model';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('AuroraStore', () => {
    const forecast = new KpForecast([{ start: new Date(), kp: 3 }]);
    const getKpForecast = vi.fn(() => of(forecast));

    beforeEach(() => {
        vi.useFakeTimers();
        getKpForecast.mockClear();
        TestBed.configureTestingModule({
            providers: [{ provide: NoaaService, useValue: { getKpForecast } }],
        });
    });

    afterEach(() => vi.useRealTimers());

    it('should fetch right away and every 30 minutes, and survive failures', () => {
        getKpForecast.mockReturnValueOnce(throwError(() => new Error('offline')));
        const store = TestBed.inject(AuroraStore);
        TestBed.tick();
        vi.advanceTimersByTime(0);
        expect(store.forecast()).toBeUndefined();

        vi.advanceTimersByTime(1000 * 60 * 30);
        expect(store.forecast()).toBe(forecast);
        expect(getKpForecast).toHaveBeenCalledTimes(2);
    });
});
