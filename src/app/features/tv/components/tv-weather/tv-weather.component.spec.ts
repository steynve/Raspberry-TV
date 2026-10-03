import { RainSlot } from '@data/utils/rain';
import { SunState } from '@data/utils/sun';
import { ClockStore } from '@data/stores/clock.store';
import { Component, input, signal } from '@angular/core';
import { WeatherStore } from '@data/stores/weather.store';
import { TvWeatherComponent } from './tv-weather.component';
import { TvRainComponent } from '../tv-rain/tv-rain.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TvForecastComponent } from '../tv-forecast/tv-forecast.component';
import { OpenMeteoForecast } from '@data/models/openmeteo.model';
import { OpenMeteoAirQuality } from '@data/models/openmeteo.model';
import { airQualityMock, forecastMock } from '@data/services/mocks/openmeteo.mock';

@Component({ selector: 'app-tv-rain', template: '' })
class TvRainStubComponent {
    public readonly slots = input<RainSlot[]>();
}

@Component({ selector: 'app-tv-forecast', template: '' })
class TvForecastStubComponent {
    public readonly daily = input();
}

describe('TvWeatherComponent', () => {
    let component: TvWeatherComponent;
    let fixture: ComponentFixture<TvWeatherComponent>;
    let rain: ReturnType<typeof signal<RainSlot[]>>;
    let airQuality: ReturnType<typeof signal<OpenMeteoAirQuality | undefined>>;
    let sun: ReturnType<typeof signal<Partial<SunState>>>;

    const element = (): HTMLElement => fixture.nativeElement;

    beforeEach(() => {
        rain = signal<RainSlot[]>([{ time: new Date(2026, 2, 1, 12), precipitation: 0 }]);
        airQuality = signal<OpenMeteoAirQuality | undefined>(airQualityMock);
        sun = signal<Partial<SunState>>({ phase: 'day' });

        TestBed.configureTestingModule({
            providers: [
                { provide: ClockStore, useValue: { now: signal(new Date(2026, 2, 1, 11, 30)) } },
                {
                    provide: WeatherStore,
                    useValue: {
                        forecast: signal<OpenMeteoForecast | undefined>(forecastMock),
                        airQuality,
                        rain,
                        sun,
                    },
                },
            ],
        });
        TestBed.overrideComponent(TvWeatherComponent, {
            remove: { imports: [TvRainComponent, TvForecastComponent] },
            add: { imports: [TvRainStubComponent, TvForecastStubComponent] },
        });

        fixture = TestBed.createComponent(TvWeatherComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should describe the current weather', () => {
        expect(component.condition()).toEqual({ description: 'Partly cloudy', icon: 'cloud-sun' });
        expect(element().querySelector('.now-temperature')?.textContent).toBe('12°');
    });

    it('should show the wind with the gusts of the current hour', () => {
        expect(component.wind()).toBe('SW 14 km/h · gusts 33');
    });

    it('should show the trail condition', () => {
        // 6 mm of rain an hour and a half ago
        expect(component.trail()).toBe('Trails muddy');
    });

    it('should say how long it stays good to ride', () => {
        // The mock's forecast ends at 13:00, dry since 10:00
        expect(component.ride()).toBe('Good to ride until 13:00');
    });

    describe('UV', () => {
        it("should warn on a sunny day with today's maximum", () => {
            // The mock's maximum today is 6.4
            expect(element().querySelector('.now-uv')?.textContent?.trim()).toBe(
                'UV 6 · wear sunscreen',
            );
        });

        it('should stay quiet at night', () => {
            sun.set({ phase: 'night' });
            fixture.detectChanges();

            expect(element().querySelector('.now-uv')).toBeNull();
        });
    });

    describe('rain', () => {
        it('should say it stays dry and leave the middle of the screen empty', () => {
            expect(element().querySelector('.now-dry')?.textContent).toContain(
                'Dry for the next 2 hours',
            );
            expect(element().querySelector('app-tv-rain')).toBeNull();
        });

        it('should show the rain widget when rain is coming', () => {
            rain.set([
                { time: new Date(2026, 2, 1, 12), precipitation: 0 },
                { time: new Date(2026, 2, 1, 12, 15), precipitation: 0.4 },
            ]);
            fixture.detectChanges();

            expect(element().querySelector('app-tv-rain.widget.rain')).toBeTruthy();
            expect(element().querySelector('.now-dry')).toBeNull();
        });
    });

    it('should always render the week', () => {
        expect(element().querySelector('app-tv-forecast.widget.week')).toBeTruthy();
    });

    describe('pollen', () => {
        it('should score each group by its highest pollen type', () => {
            expect(component.pollen().map((item) => item.score)).toEqual([4, 0, 10]);
        });

        it('should render every group and mark the ones without pollen', () => {
            const items = element().querySelectorAll<HTMLElement>('.pollen-item');

            expect(items.length).toBe(3);
            expect(items[0].textContent).toContain('Trees');
            expect(items[0].style.getPropertyValue('--level')).toBe('0.4');
            expect(items[1].classList).toContain('none');
        });

        it('should hide the pollen without air quality data', () => {
            airQuality.set(undefined);
            fixture.detectChanges();

            expect(component.pollen()).toEqual([]);
            expect(element().querySelector('.pollen')).toBeNull();
        });
    });
});
