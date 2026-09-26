import { of } from 'rxjs';
import { signal } from '@angular/core';
import { sunState } from '@data/utils/sun';
import { SunState } from '@data/utils/sun';
import { PexelsService } from '@data/services/pexels.service';
import { WeatherStore } from '@data/stores/weather.store';
import { TvWallpaperComponent } from './tv-wallpaper.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpenMeteoForecast } from '@data/models/openmeteo-forecast.model';
import { PexelsServiceMock } from '@data/services/mocks/pexels.service.mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forecastMock } from '@data/services/mocks/openmeteo.mock';
import { OpenMeteoForecastCurrent } from '@data/models/openmeteo-forecast-current.model';

describe('TvWallpaperComponent', () => {
    let component: TvWallpaperComponent;
    let fixture: ComponentFixture<TvWallpaperComponent>;
    let pexelsService: PexelsService;
    let forecast: ReturnType<typeof signal<OpenMeteoForecast | undefined>>;
    let sun: ReturnType<typeof signal<SunState | undefined>>;

    const withWeatherCode = (code: number): OpenMeteoForecast =>
        new OpenMeteoForecast(
            new OpenMeteoForecastCurrent('2026-07-15T12:00', 900, 20, 10, 180, 1, code),
            forecastMock.daily,
            forecastMock.minutely_15,
            forecastMock.hourly,
        );

    // toObservable() runs as a view effect, so change detection passes the new mood on
    const advance = (ms: number, target = fixture): void => {
        target.detectChanges();
        vi.advanceTimersByTime(ms);
        target.detectChanges();
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 6, 15, 12));

        forecast = signal<OpenMeteoForecast | undefined>(withWeatherCode(2));
        sun = signal<SunState | undefined>(sunState(forecastMock.daily, new Date(2026, 2, 1, 12)));

        TestBed.configureTestingModule({
            providers: [
                { provide: PexelsService, useClass: PexelsServiceMock },
                { provide: WeatherStore, useValue: { forecast, sun } },
            ],
        });

        pexelsService = TestBed.inject(PexelsService);
        vi.spyOn(pexelsService, 'getPhotos');

        fixture = TestBed.createComponent(TvWallpaperComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        advance(0);
    });

    afterEach(() => vi.useRealTimers());

    it('should fetch photos for the current weather right away', () => {
        expect(component.mood()).toBe('default');
        expect(pexelsService.getPhotos).toHaveBeenCalledWith('summer nature forest wallpaper');
    });

    it('should only switch photos once the weather has settled', () => {
        forecast.set(withWeatherCode(63));
        advance(1000 * 60 * 10);
        expect(pexelsService.getPhotos).not.toHaveBeenCalledWith('rainy forest landscape');

        advance(1000 * 60 * 5);
        expect(pexelsService.getPhotos).toHaveBeenLastCalledWith('rainy forest landscape');
    });

    it('should ignore a short shower', () => {
        forecast.set(withWeatherCode(63));
        advance(1000 * 60 * 5);
        forecast.set(withWeatherCode(2));
        advance(1000 * 60 * 20);

        expect(pexelsService.getPhotos).toHaveBeenCalledTimes(1);
    });

    it('should reuse the photos of a mood it has seen this week', () => {
        forecast.set(withWeatherCode(63));
        advance(1000 * 60 * 15);
        forecast.set(withWeatherCode(2));
        advance(1000 * 60 * 15);

        expect(pexelsService.getPhotos).toHaveBeenCalledTimes(2);
    });

    it('should refresh the photos every week', () => {
        advance(1000 * 60 * 60 * 24 * 7);

        expect(pexelsService.getPhotos).toHaveBeenCalledTimes(2);
    });

    it('should fall back to the default photos when the weather does not load', () => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: PexelsService, useValue: { getPhotos: vi.fn(() => of(undefined)) } },
                {
                    provide: WeatherStore,
                    useValue: { forecast: signal(undefined), sun: signal(undefined) },
                },
            ],
        });
        const getPhotos = TestBed.inject(PexelsService).getPhotos;
        const offline = TestBed.createComponent(TvWallpaperComponent);

        advance(1000 * 9, offline);
        expect(getPhotos).not.toHaveBeenCalled();

        advance(1000, offline);
        expect(getPhotos).toHaveBeenCalledWith('summer nature forest wallpaper');
    });

    it('should use the day of the month as photo index', () => {
        expect(component.dayIndex()).toBe(15);
    });

    it("should show today's photo, and a tiny copy for the glass widgets", () => {
        fixture.detectChanges();
        const wallpaper: HTMLElement = fixture.nativeElement.querySelector('.tv-wallpaper');

        expect(component.currentBackgroundImage()).toBe(
            "url('original.jpg?auto=compress&fit=crop&w=1920&h=1080')",
        );
        expect(wallpaper.style.getPropertyValue('--photo-blurred')).toBe(
            "url('original.jpg?auto=compress&fit=crop&w=48&h=27')",
        );
        expect(wallpaper.style.getPropertyValue('--photo-color')).toBe('#ffffff');
    });

    it('should show nothing without photos', () => {
        component.photos.set(undefined);

        expect(component.currentBackgroundImage()).toBeNull();
    });

    it('should dim at night', () => {
        const wallpaper: HTMLElement = fixture.nativeElement.querySelector('.tv-wallpaper');
        expect(wallpaper.classList).not.toContain('night');

        sun.set(sunState(forecastMock.daily, new Date(2026, 2, 1, 22)));
        fixture.detectChanges();

        expect(wallpaper.classList).toContain('night');
    });

    it('should dim the photo when idle', () => {
        fixture.componentRef.setInput('idle', true);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.tv-wallpaper').classList).toContain('idle');
    });
});
