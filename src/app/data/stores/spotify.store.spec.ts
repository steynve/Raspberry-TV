import { delay, of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { SpotifyStore } from './spotify.store';
import { PowerStore } from './power.store';
import { SpotifyService } from '@data/services/spotify.service';
import { SpotifyState } from '@data/models/spotify-state.model';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('SpotifyStore', () => {
    // Lets the store's effects run and its first (zero-delay) poll fire
    const settle = (): void => {
        TestBed.tick();
        vi.advanceTimersByTime(0);
    };

    const playing = new SpotifyState(1, true, true, 'Everlong', 'Foo Fighters', '');
    const getState = vi.fn(() => of(playing));
    const disconnect = vi.fn(() => of('disconnected'));

    beforeEach(() => {
        vi.useFakeTimers();
        getState.mockClear();
        getState.mockImplementation(() => of(playing));
        disconnect.mockClear();
        TestBed.configureTestingModule({
            providers: [{ provide: SpotifyService, useValue: { getState, disconnect } }],
        });
    });

    afterEach(() => vi.useRealTimers());

    it('should keep the newest answer when refreshes overlap at a track change', () => {
        const next = new SpotifyState(2, true, true, 'Monkey Wrench', 'Foo Fighters', '');
        const store = TestBed.inject(SpotifyStore);
        settle();

        // The first answer is slow and still has the previous song
        getState.mockImplementationOnce(() => of(playing).pipe(delay(500)));
        getState.mockImplementationOnce(() => of(next).pipe(delay(50)));
        store.refresh();
        store.refresh();
        vi.advanceTimersByTime(1000);

        expect(store.state()).toBe(next);
    });

    it('should check every 15 seconds, in case an update slipped through', () => {
        TestBed.inject(SpotifyStore);
        settle();
        const calls = getState.mock.calls.length;

        vi.advanceTimersByTime(1000 * 15);
        expect(getState).toHaveBeenCalledTimes(calls + 1);
    });

    it('should not check while the TV sleeps', () => {
        TestBed.inject(SpotifyStore);
        const power = TestBed.inject(PowerStore);
        settle();

        power.sleep();
        settle();
        const calls = getState.mock.calls.length;

        vi.advanceTimersByTime(1000 * 60);
        expect(getState).toHaveBeenCalledTimes(calls);
    });

    it('should correct a stale "not playing" at the next check', () => {
        // The Pi wrote "not playing" at an unlucky moment, and no event followed to fix it
        getState.mockImplementationOnce(() => of(new SpotifyState(1, false, false, '', '', '')));
        const store = TestBed.inject(SpotifyStore);
        settle();
        expect(store.state()?.playing).toBe(false);

        vi.advanceTimersByTime(1000 * 15);
        expect(store.state()).toBe(playing);
    });

    it('should read the state right away, and on every refresh', () => {
        const store = TestBed.inject(SpotifyStore);
        settle();
        expect(store.state()).toBe(playing);

        store.refresh();
        expect(getState).toHaveBeenCalledTimes(2);
    });

    it('should ask for the smaller cover, and only while something is loaded', () => {
        const cover = 'https://i.scdn.co/image/ab67616d0000b273abc';
        getState.mockImplementation(() =>
            of(new SpotifyState(1, true, true, 'Everlong', 'Foo Fighters', '', cover)),
        );
        const store = TestBed.inject(SpotifyStore);
        settle();
        expect(store.cover()).toBe('https://i.scdn.co/image/ab67616d00001e02abc');

        getState.mockImplementation(() =>
            of(new SpotifyState(2, false, false, 'Everlong', 'Foo Fighters', '', cover)),
        );
        store.refresh();
        expect(store.cover()).toBe('');
    });

    it('should stay empty when Spotify was not used since the Pi started', () => {
        getState.mockImplementation(() => throwError(() => new Error('404')));
        const store = TestBed.inject(SpotifyStore);
        settle();

        expect(store.state()).toBeUndefined();
    });

    it('should let go of the phone when the TV turns off, and read it again when the TV comes back', () => {
        const store = TestBed.inject(SpotifyStore);
        const power = TestBed.inject(PowerStore);
        settle();

        power.sleep();
        settle();
        expect(disconnect).toHaveBeenCalled();

        power.wake();
        settle();
        expect(getState).toHaveBeenCalledTimes(2);
        expect(store.state()).toBe(playing);
    });

    it('should also let go of a phone that is connected but paused', () => {
        getState.mockImplementation(() =>
            of(new SpotifyState(1, true, false, 'Everlong', 'Foo Fighters', '')),
        );
        TestBed.inject(SpotifyStore);
        const power = TestBed.inject(PowerStore);
        settle();

        power.sleep();
        settle();

        expect(disconnect).toHaveBeenCalled();
    });

    it('should leave Spotify alone when no phone is connected', () => {
        getState.mockImplementation(() => of(new SpotifyState(1, false, false, '', '', '')));
        TestBed.inject(SpotifyStore);
        const power = TestBed.inject(PowerStore);
        settle();

        power.sleep();
        settle();

        expect(disconnect).not.toHaveBeenCalled();
    });
});
