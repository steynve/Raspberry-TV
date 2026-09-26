import { Subject } from 'rxjs';
import { TvComponent } from './tv.component';
import { Component, input } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeyboardEventKey } from '@data/models/keyboard-event-key.type';

@Component({ selector: 'app-tv-radio', template: '' })
class TvRadioStubComponent {
    public readonly keyDownSubject = input.required<Subject<KeyboardEventKey>>();
    public readonly overlay = input(false);
}

@Component({ selector: 'app-tv-clock', template: '' })
class TvClockStubComponent {}

@Component({ selector: 'app-tv-weather', template: '' })
class TvWeatherStubComponent {}

@Component({ selector: 'app-tv-wallpaper', template: '<ng-content />' })
class TvWallpaperStubComponent {
    public readonly hidden = input(false);
}

describe('TvComponent', () => {
    let component: TvComponent;
    let fixture: ComponentFixture<TvComponent>;

    const pressKey = (key: KeyboardEventKey): void => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    };

    beforeEach(() => {
        TestBed.overrideComponent(TvComponent, {
            set: {
                imports: [
                    TvRadioStubComponent,
                    TvClockStubComponent,
                    TvWeatherStubComponent,
                    TvWallpaperStubComponent,
                ],
            },
        });

        fixture = TestBed.createComponent(TvComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('toggleAppVisibility()', () => {
        it('should toggle hidden', () => {
            component.toggleAppVisibility();
            expect(component.hidden()).toBe(true);

            component.toggleAppVisibility();
            expect(component.hidden()).toBe(false);
        });

        it('should close the overlay instead of hiding the app when the overlay is open', () => {
            component.overlay.set(true);

            component.toggleAppVisibility();

            expect(component.overlay()).toBe(false);
            expect(component.hidden()).toBe(false);
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

        it('should toggle hidden on "Backspace"', () => {
            pressKey('Backspace');
            expect(component.hidden()).toBe(true);
        });

        it('should toggle the overlay on "Enter" and render it', () => {
            pressKey('Enter');
            fixture.detectChanges();

            expect(component.overlay()).toBe(true);
            expect(fixture.nativeElement.querySelector('.tv').classList).toContain('overlay');
        });
    });
});
