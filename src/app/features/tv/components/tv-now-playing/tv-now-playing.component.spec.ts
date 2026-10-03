import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PowerStore } from '@data/stores/power.store';
import { RadioStore } from '@data/stores/radio.store';
import { SpotifyStore } from '@data/stores/spotify.store';
import { SpotifyState } from '@data/models/spotify-state.model';
import { TvNowPlayingComponent } from './tv-now-playing.component';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { radioStoreMock, RadioStoreMock } from '@data/services/mocks/radio-store.mock';
import { spotifyInactiveMock, spotifyStateMock } from '@data/services/mocks/spotify.mock';

describe('TvNowPlayingComponent', () => {
    let radio: RadioStoreMock;
    let state: ReturnType<typeof signal<SpotifyState>>;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(100000);
        radio = radioStoreMock();
        state = signal(spotifyInactiveMock);
        TestBed.configureTestingModule({
            providers: [
                { provide: RadioStore, useValue: radio },
                { provide: SpotifyStore, useValue: { state } },
            ],
        });
    });

    afterEach(() => vi.useRealTimers());

    const render = (): { element: HTMLElement; update: () => void } => {
        const fixture = TestBed.createComponent(TvNowPlayingComponent);
        const update = (): void => {
            fixture.detectChanges();
            TestBed.tick();
            fixture.detectChanges();
        };
        update();
        return { element: fixture.nativeElement, update };
    };

    const bar = (element: HTMLElement): string | undefined =>
        element.querySelector<HTMLElement>('.progress-bar')?.style.transform;

    it('should show the station and its song', () => {
        radio.song.set('Hedonism');
        radio.artist.set('Skunk Anansie');
        const { element } = render();

        expect(element.querySelector('.station')?.textContent).toBe('KINK');
        expect(element.querySelector('.song')?.textContent).toBe('Hedonism');
        expect(element.querySelector('.artist')?.textContent).toBe('Skunk Anansie');
        expect(element.querySelector('.progress')).toBeNull();
    });

    it('should show the number being typed', () => {
        radio.typedNumber.set('1');
        radio.typedChannel.set(radio.channels[0]);
        const { element } = render();

        expect(element.querySelector('.channel-number')?.textContent).toBe('1');
    });

    it('should show how far the Spotify song is, and follow it while it plays', () => {
        radio.channelIndex.set(0);
        radio.song.set('Everlong');
        state.set(spotifyStateMock({ position: 50000, positionAt: 100000, duration: 200000 }));
        const { element, update } = render();
        expect(bar(element)).toBe('scaleX(0.25)');

        vi.advanceTimersByTime(10000);
        update();
        expect(bar(element)).toBe('scaleX(0.3)');
    });

    it('should hold the bar still while paused', () => {
        radio.channelIndex.set(0);
        radio.song.set('Everlong');
        radio.isPlaying.set(false);
        state.set(
            spotifyStateMock({ playing: false, position: 50000, positionAt: 0, duration: 200000 }),
        );
        const { element, update } = render();

        vi.advanceTimersByTime(10000);
        update();

        expect(bar(element)).toBe('scaleX(0.25)');
        expect(element.querySelector('.progress')?.classList).toContain('paused');
    });

    it('should stop ticking while the TV is off', () => {
        radio.channelIndex.set(0);
        radio.song.set('Everlong');
        state.set(spotifyStateMock({ position: 50000, positionAt: 100000, duration: 200000 }));
        const { element, update } = render();
        TestBed.inject(PowerStore).sleep();
        update();

        vi.advanceTimersByTime(10000);
        update();

        expect(bar(element)).toBe('scaleX(0.25)');
    });

    it('should explain what to do on Spotify without a song', () => {
        radio.channelIndex.set(0);
        const { element } = render();

        expect(element.querySelector('.hint')?.textContent).toContain('pick a playlist');
    });

    it('should ask for a key press when autoplay is blocked', () => {
        radio.blocked.set(true);
        const { element } = render();

        expect(element.querySelector('.blocked')).toBeTruthy();
    });
});
