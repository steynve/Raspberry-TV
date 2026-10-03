import { EMPTY, Observable, of } from 'rxjs';
import { TvService, TvState } from '@data/services/tv.service';
import { TvComponent } from './tv.component';
import { Component, computed, input, signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PowerStore } from '@data/stores/power.store';
import { RadioStore } from '@data/stores/radio.store';
import { SpotifyStore } from '@data/stores/spotify.store';
import { KeyboardEventKey } from '@data/models/keyboard-event-key.type';
import { SpotifyPairing, SpotifyPlaylist } from '@data/services/spotify.service';
import { TvSystemComponent } from './components/tv-system/tv-system.component';
import { TvChannelsComponent } from './components/tv-channels/tv-channels.component';
import { radioStoreMock, RadioStoreMock } from '@data/services/mocks/radio-store.mock';
import { spotifyInactiveMock } from '@data/services/mocks/spotify.mock';

@Component({ selector: 'app-tv-now-playing', template: '' })
class TvNowPlayingStubComponent {}

@Component({ selector: 'app-tv-clock', template: '' })
class TvClockStubComponent {}

@Component({ selector: 'app-tv-pi-alert', template: '' })
class TvPiAlertStubComponent {}

@Component({ selector: 'app-tv-sky', template: '' })
class TvSkyStubComponent {}

@Component({ selector: 'app-tv-waste', template: '' })
class TvWasteStubComponent {}

@Component({ selector: 'app-tv-weather', template: '' })
class TvWeatherStubComponent {}

@Component({ selector: 'app-tv-system', template: '' })
class TvSystemStubComponent {}

@Component({ selector: 'app-tv-wallpaper', template: '<ng-content />' })
class TvWallpaperStubComponent {
    public readonly idle = input(false);
}

@Component({ selector: 'app-tv-ambient', template: '' })
class TvAmbientStubComponent {
    public readonly visible = input(false);
}

const TEN_MINUTES = 1000 * 60 * 10;

describe('TvComponent', () => {
    let component: TvComponent;
    let fixture: ComponentFixture<TvComponent>;
    let radio: RadioStoreMock;
    const spotify = {
        state: signal(spotifyInactiveMock),
        signedIn: signal(true),
        pairing: signal<SpotifyPairing | null>(null),
        playlists: signal<SpotifyPlaylist[]>([]),
        likedSongs: computed(() => 'spotify:user:steyn:collection'),
        loadLibrary: vi.fn(),
        play: vi.fn(),
        next: vi.fn(),
        previous: vi.fn(),
    };

    const pressKey = (key: KeyboardEventKey): void => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        fixture.detectChanges();
    };

    let tvState: Observable<TvState> = EMPTY;

    beforeEach(() => {
        vi.useFakeTimers();
        radio = radioStoreMock();
        spotify.state.set(spotifyInactiveMock);
        spotify.next.mockClear();
        spotify.previous.mockClear();

        TestBed.configureTestingModule({
            providers: [
                { provide: TvService, useValue: { getState: (): Observable<TvState> => tvState } },
                { provide: RadioStore, useValue: radio },
                { provide: SpotifyStore, useValue: spotify },
            ],
        });
        TestBed.overrideComponent(TvComponent, {
            set: {
                imports: [
                    TvNowPlayingStubComponent,
                    TvChannelsComponent,
                    TvClockStubComponent,
                    TvSkyStubComponent,
                    TvWasteStubComponent,
                    TvPiAlertStubComponent,
                    TvWeatherStubComponent,
                    TvWallpaperStubComponent,
                    TvAmbientStubComponent,
                ],
            },
        });
        TestBed.overrideComponent(TvChannelsComponent, {
            remove: { imports: [TvSystemComponent] },
            add: { imports: [TvSystemStubComponent] },
        });

        fixture = TestBed.createComponent(TvComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => vi.useRealTimers());

    const selected = (): string | undefined =>
        fixture.nativeElement.querySelector('.channel.selected')?.textContent?.trim();

    it('should start the radio after the first render', () => {
        expect(radio.start).toHaveBeenCalled();
    });

    it('should go straight to sleep when it starts while the TV is off', () => {
        tvState = of('off');
        fixture = TestBed.createComponent(TvComponent);
        fixture.detectChanges();
        tvState = EMPTY;

        expect(fixture.componentInstance.idle()).toBe(true);
        expect(TestBed.inject(PowerStore).awake()).toBe(false);
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
            expect(radio.playPause).not.toHaveBeenCalled();

            pressKey('ArrowDown');
            expect(component.overlay()).toBe(true);
        });

        it('should act on a number right away, even when idle', () => {
            vi.advanceTimersByTime(TEN_MINUTES);

            pressKey('3');

            expect(component.idle()).toBe(false);
            expect(radio.typeDigit).toHaveBeenCalledWith('3');
        });

        it('should wake on F13 from the TV, which never does anything else', () => {
            vi.advanceTimersByTime(TEN_MINUTES);

            pressKey('F13');
            expect(component.idle()).toBe(false);

            pressKey('F13');
            expect(component.overlay()).toBe(false);
        });

        it('should go to sleep on F14 from the TV, and wake on the next signal', () => {
            const power = TestBed.inject(PowerStore);
            pressKey('ArrowDown');

            pressKey('F14');
            expect(power.awake()).toBe(false);
            expect(component.idle()).toBe(true);
            expect(component.overlay()).toBe(false);

            pressKey('F13');
            expect(power.awake()).toBe(true);
            expect(component.idle()).toBe(false);
        });

        it('should close the channel list when going idle', () => {
            pressKey('ArrowDown');
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

    describe('remote', () => {
        it('should pause and play on OK', () => {
            pressKey('Enter');

            expect(radio.playPause).toHaveBeenCalled();
            expect(component.overlay()).toBe(false);
        });

        it('should pause Spotify on OK too, but open the list when nothing is loaded', () => {
            radio.channelIndex.set(0);

            pressKey('Enter');
            expect(component.overlay()).toBe(true);
            expect(radio.playPause).not.toHaveBeenCalled();

            pressKey('Backspace'); // from the playlists back to the stations
            pressKey('Backspace'); // and closed
            spotify.state.set({ ...spotifyInactiveMock, active: true });
            pressKey('Enter');
            expect(radio.playPause).toHaveBeenCalled();
        });

        it('should open the channel list with up and down, and hand it the keys', () => {
            pressKey('ArrowDown');
            expect(component.overlay()).toBe(true);
            expect(fixture.nativeElement.querySelector('.tv').classList).toContain('overlay');
            expect(selected()).toBe('KINK');

            pressKey('ArrowDown');
            expect(selected()).toBe('Reggae');

            pressKey('Enter');
            expect(radio.playChannel).toHaveBeenCalledWith(2);
            expect(component.overlay()).toBe(false);
        });

        it('should close the channel list on Back, and go idle on the next', () => {
            pressKey('ArrowUp');

            pressKey('Backspace');
            expect(component.overlay()).toBe(false);
            expect(component.idle()).toBe(false);

            pressKey('Backspace');
            expect(component.idle()).toBe(true);
        });

        it('should step through stations and play numbers, with or without the list', () => {
            pressKey('PageUp');
            pressKey('ArrowDown');
            pressKey('PageDown');
            pressKey('7');

            expect(radio.step).toHaveBeenCalledWith(1);
            expect(radio.step).toHaveBeenCalledWith(-1);
            expect(radio.typeDigit).toHaveBeenCalledWith('7');
        });

        it("should skip Spotify's songs with left and right", () => {
            radio.channelIndex.set(0);

            pressKey('ArrowRight');
            pressKey('ArrowLeft');

            expect(spotify.next).toHaveBeenCalled();
            expect(spotify.previous).toHaveBeenCalled();
        });

        it('should leave left and right alone on the radio', () => {
            pressKey('ArrowRight');

            expect(spotify.next).not.toHaveBeenCalled();
        });

        it('should start the radio on any key when autoplay was blocked', () => {
            pressKey('ArrowUp');

            expect(radio.startIfBlocked).toHaveBeenCalled();
        });
    });
});
