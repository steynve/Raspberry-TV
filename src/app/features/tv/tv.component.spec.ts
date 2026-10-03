import { EMPTY, Observable, of, Subject } from 'rxjs';
import { TvService, TvState } from '@data/services/tv.service';
import { TvComponent } from './tv.component';
import { Component, input } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PowerStore } from '@data/stores/power.store';
import { SpotifyStore } from '@data/stores/spotify.store';
import { KeyboardEventKey } from '@data/models/keyboard-event-key.type';

@Component({ selector: 'app-tv-radio', template: '' })
class TvRadioStubComponent {
    public readonly keyDownSubject = input.required<Subject<KeyboardEventKey>>();
    public readonly overlay = input(false);
}

@Component({ selector: 'app-tv-clock', template: '' })
class TvClockStubComponent {}

@Component({ selector: 'app-tv-pi-alert', template: '' })
class TvPiAlertStubComponent {}

@Component({ selector: 'app-tv-sky', template: '' })
class TvSkyStubComponent {}

@Component({ selector: 'app-tv-weather', template: '' })
class TvWeatherStubComponent {}

@Component({ selector: 'app-tv-wallpaper', template: '<ng-content />' })
class TvWallpaperStubComponent {
    public readonly idle = input(false);
}

@Component({ selector: 'app-tv-ambient', template: '' })
class TvAmbientStubComponent {
    public readonly visible = input(false);
    public readonly song = input('');
    public readonly artist = input('');
    public readonly station = input('');
    public readonly playing = input(false);
    public readonly cover = input('');
    public readonly coverColor = input<string>();
}

const TEN_MINUTES = 1000 * 60 * 10;

describe('TvComponent', () => {
    let component: TvComponent;
    let fixture: ComponentFixture<TvComponent>;

    const pressKey = (key: KeyboardEventKey): void => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    };

    const refresh = vi.fn();
    let tvState: Observable<TvState> = EMPTY;

    beforeEach(() => {
        vi.useFakeTimers();
        refresh.mockClear();

        TestBed.configureTestingModule({
            providers: [
                { provide: SpotifyStore, useValue: { refresh } },
                { provide: TvService, useValue: { getState: (): Observable<TvState> => tvState } },
            ],
        });
        TestBed.overrideComponent(TvComponent, {
            set: {
                imports: [
                    TvRadioStubComponent,
                    TvClockStubComponent,
                    TvSkyStubComponent,
                    TvPiAlertStubComponent,
                    TvWeatherStubComponent,
                    TvWallpaperStubComponent,
                    TvAmbientStubComponent,
                ],
            },
        });

        fixture = TestBed.createComponent(TvComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => vi.useRealTimers());

    it('should go straight to sleep when it starts while the TV is off', () => {
        tvState = of('off');
        fixture = TestBed.createComponent(TvComponent);
        fixture.detectChanges();
        tvState = EMPTY;

        expect(fixture.componentInstance.idle()).toBe(true);
        expect(TestBed.inject(PowerStore).awake()).toBe(false);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('idle', () => {
        it('should go idle after 10 minutes without a key press', () => {
            vi.advanceTimersByTime(TEN_MINUTES - 1);
            expect(component.idle()).toBe(false);

            vi.advanceTimersByTime(1);
            expect(component.idle()).toBe(true);
        });

        it('should start counting again on every key press', () => {
            vi.advanceTimersByTime(TEN_MINUTES - 1000);
            pressKey('ArrowDown');
            vi.advanceTimersByTime(TEN_MINUTES - 1000);

            expect(component.idle()).toBe(false);
        });

        it('should only wake on the first key press, without acting on it', () => {
            vi.advanceTimersByTime(TEN_MINUTES);

            pressKey('Enter');
            expect(component.idle()).toBe(false);
            expect(component.overlay()).toBe(false);

            pressKey('Enter');
            expect(component.overlay()).toBe(true);
        });

        it('should act on a number or the yellow button right away, even when idle', () => {
            const keys: KeyboardEventKey[] = [];
            component.keyDownSubject.subscribe((key) => keys.push(key));
            vi.advanceTimersByTime(TEN_MINUTES);

            pressKey('3');
            expect(component.idle()).toBe(false);

            component.goIdle();
            pressKey('F18');
            expect(keys).toEqual(['3', 'F18']);
        });

        it('should wake on F13 from the TV, which never does anything else', () => {
            const keys: KeyboardEventKey[] = [];
            component.keyDownSubject.subscribe((key) => keys.push(key));
            vi.advanceTimersByTime(TEN_MINUTES);

            pressKey('F13');
            expect(component.idle()).toBe(false);

            pressKey('F13');
            expect(keys).toEqual([]);
        });

        it('should go to sleep on F14 from the TV, and wake on the next signal', () => {
            const power = TestBed.inject(PowerStore);
            pressKey('Enter');

            pressKey('F14');
            expect(power.awake()).toBe(false);
            expect(component.idle()).toBe(true);
            expect(component.overlay()).toBe(false);

            pressKey('F13');
            expect(power.awake()).toBe(true);
            expect(component.idle()).toBe(false);
        });

        it('should refresh Spotify on F15 from the Pi, without waking anything', () => {
            vi.advanceTimersByTime(TEN_MINUTES);

            pressKey('F15');

            expect(refresh).toHaveBeenCalled();
            expect(component.idle()).toBe(true);
        });

        it('should wake up on a remote button as well', () => {
            const power = TestBed.inject(PowerStore);
            pressKey('F14');

            pressKey('ArrowUp');

            expect(power.awake()).toBe(true);
            expect(component.idle()).toBe(false);
        });

        it('should close the channel list when going idle', () => {
            pressKey('Enter');
            vi.advanceTimersByTime(TEN_MINUTES);

            expect(component.overlay()).toBe(false);
            expect(component.idle()).toBe(true);
        });

        it('should hand the idle state to the wallpaper, the dashboard and the ambient screen', () => {
            vi.advanceTimersByTime(TEN_MINUTES);
            fixture.detectChanges();

            const wallpaper = fixture.debugElement.query((el) => el.name === 'app-tv-wallpaper');
            const ambient = fixture.debugElement.query((el) => el.name === 'app-tv-ambient');

            expect(fixture.nativeElement.querySelector('.tv').classList).toContain('idle');
            expect((wallpaper.componentInstance as TvWallpaperStubComponent).idle()).toBe(true);
            expect((ambient.componentInstance as TvAmbientStubComponent).visible()).toBe(true);
        });
    });

    describe('back()', () => {
        it('should go to the idle screen right away', () => {
            component.back();

            expect(component.idle()).toBe(true);
        });

        it('should close the channel list instead when it is open', () => {
            component.overlay.set(true);

            component.back();

            expect(component.overlay()).toBe(false);
            expect(component.idle()).toBe(false);
        });
    });

    describe('toggleOverlayVisibility()', () => {
        it('should toggle overlay', () => {
            component.toggleOverlayVisibility();
            expect(component.overlay()).toBe(true);

            component.toggleOverlayVisibility();
            expect(component.overlay()).toBe(false);
        });
    });

    describe('keyboard', () => {
        it('should forward window keydown events to keyDownSubject', () => {
            const keys: KeyboardEventKey[] = [];
            component.keyDownSubject.subscribe((key) => keys.push(key));

            pressKey('ArrowUp');

            expect(keys).toEqual(['ArrowUp']);
        });

        it('should go to the idle screen on "Backspace"', () => {
            pressKey('Backspace');
            expect(component.idle()).toBe(true);
        });

        it('should wake on the next key and restart the countdown', () => {
            pressKey('Backspace');
            pressKey('ArrowDown');
            expect(component.idle()).toBe(false);

            vi.advanceTimersByTime(TEN_MINUTES);
            expect(component.idle()).toBe(true);
        });

        it('should toggle the overlay on "Enter" and render it', () => {
            pressKey('Enter');
            fixture.detectChanges();

            expect(component.overlay()).toBe(true);
            expect(fixture.nativeElement.querySelector('.tv').classList).toContain('overlay');
        });
    });
});
