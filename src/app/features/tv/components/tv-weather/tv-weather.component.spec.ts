import { of } from 'rxjs';
import { TvWeatherComponent } from './tv-weather.component';
import { OpenMeteoService } from '@data/services/openmeteo.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpenMeteoForecast } from '@data/models/openmeteo-forecast.model';
import { OpenMeteoAirQuality } from '@data/models/openmeteo-airquality.model';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenMeteoForecastDaily } from '@data/models/openmeteo-forecast-daily.model';
import { OpenMeteoForecastCurrent } from '@data/models/openmeteo-forecast-current.model';
import { OpenMeteoAirqualityService } from '@data/services/openmeteo-airquality.service';
import { OpenMeteoAirQualityCurrent } from '@data/models/openmeteo-airquality-current.model';

describe('TvWeatherComponent', () => {
    let component: TvWeatherComponent;
    let fixture: ComponentFixture<TvWeatherComponent>;

    const forecast = new OpenMeteoForecast(
        new OpenMeteoForecastCurrent('2026-03-01T12:00', 900, 12.4, 5, 180, 1, 2),
        new OpenMeteoForecastDaily(
            ['2026-03-01T07:00', '2026-03-02T06:58'],
            ['2026-03-01T18:30', '2026-03-02T18:32'],
        ),
    );

    // birch 25 → 4/10, mugwort 100 → above the highest threshold → 10/10
    const airQuality = new OpenMeteoAirQuality(
        new OpenMeteoAirQualityCurrent('2026-03-01T12:00', 3600, 0, 25, 0, 100, 0, 0),
    );

    const getForecast = vi.fn(() => of(forecast));
    const getAirQuality = vi.fn(() => of(airQuality));

    const createComponent = (now: Date): void => {
        vi.setSystemTime(now);
        fixture = TestBed.createComponent(TvWeatherComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    };

    beforeEach(() => {
        vi.useFakeTimers();
        getForecast.mockClear();
        getAirQuality.mockClear();

        TestBed.configureTestingModule({
            providers: [
                { provide: OpenMeteoService, useValue: { getForecast } },
                { provide: OpenMeteoAirqualityService, useValue: { getAirQuality } },
            ],
        });
    });

    afterEach(() => vi.useRealTimers());

    it('should fetch the weather on init and every 5 minutes', () => {
        createComponent(new Date(2026, 2, 1, 12));
        expect(getForecast).toHaveBeenCalledTimes(1);
        expect(getAirQuality).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1000 * 60 * 5);

        expect(getForecast).toHaveBeenCalledTimes(2);
        expect(getAirQuality).toHaveBeenCalledTimes(2);
    });

    it('should return the weather icon for the current weather code', () => {
        createComponent(new Date(2026, 2, 1, 12));

        expect(component.weatherIcon()).toBe('http://openweathermap.org/img/wn/02d@2x.png');
    });

    describe('pollenGroupScore()', () => {
        it('should return the highest score within a group', () => {
            createComponent(new Date(2026, 2, 1, 12));

            expect(component.pollenGroupScore('tree')).toBe(4);
            expect(component.pollenGroupScore('grass')).toBe(0);
            expect(component.pollenGroupScore('weed')).toBe(10);
        });

        it('should only render groups with a score', () => {
            createComponent(new Date(2026, 2, 1, 12));
            fixture.detectChanges();

            const alts = Array.from(
                fixture.nativeElement.querySelectorAll('img') as NodeListOf<HTMLImageElement>,
            ).map((img) => img.alt);

            expect(alts).toContain('tree pollen icon');
            expect(alts).toContain('weed pollen icon');
            expect(alts).not.toContain('grass pollen icon');
        });
    });

    describe('setSun()', () => {
        it("should show today's sunrise before sunrise", () => {
            createComponent(new Date(2026, 2, 1, 6));
            expect(component.sun()).toEqual({ type: 'sunrise', time: '07:00' });
        });

        it("should show today's sunset between sunrise and sunset", () => {
            createComponent(new Date(2026, 2, 1, 12));
            expect(component.sun()).toEqual({ type: 'sunset', time: '18:30' });
        });

        it("should show tomorrow's sunrise after sunset", () => {
            createComponent(new Date(2026, 2, 1, 20));
            expect(component.sun()).toEqual({ type: 'sunrise', time: '06:58' });
        });
    });
});
