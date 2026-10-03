import { defer, Observable, of, Subject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { SpotifyStore } from './spotify.store';
import { PowerStore } from './power.store';
import { TvService } from '@data/services/tv.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpotifyEvent, SpotifyService, SpotifyStatus } from '@data/services/spotify.service';

describe('SpotifyStore', () => {
    const everlong = {
        name: 'Everlong',
        artist_names: ['Foo Fighters'],
        album_name: 'The Colour and the Shape',
        album_cover_url: 'https://i.scdn.co/image/ab67616d0000b273abc',
    };

    // Each connection to go-librespot is a subject of its own, so a test can close it
    let connections: Subject<SpotifyEvent>[];
    let status: SpotifyStatus | null;
    const getStatus = vi.fn(() => of(status));
    const setVolume = vi.fn(() => of(null));
    const stop = vi.fn(() => of(null));
    const turnOn = vi.fn(() => of('on'));

    const connection = (): Subject<SpotifyEvent> => connections[connections.length - 1];
    const send = (event: SpotifyEvent): void => connection().next(event);

    // Lets the store's effects run
    const settle = (): void => {
        TestBed.tick();
        vi.advanceTimersByTime(0);
    };

    const connect = (): SpotifyStore => {
        const store = TestBed.inject(SpotifyStore);
        send({ type: 'open' });
        settle();
        return store;
    };

    beforeEach(() => {
        vi.useFakeTimers();
        connections = [];
        status = null;
        [getStatus, setVolume, stop, turnOn].forEach((spy) => spy.mockClear());

        TestBed.configureTestingModule({
            providers: [
                {
                    provide: SpotifyService,
                    useValue: {
                        getStatus,
                        setVolume,
                        stop,
                        // Like the real one: every subscription is a new connection
                        events: (): Observable<SpotifyEvent> =>
                            defer(() => {
                                connections.push(new Subject<SpotifyEvent>());
                                return connection();
                            }),
                    },
                },
                { provide: TvService, useValue: { turnOn } },
            ],
        });
    });

    afterEach(() => vi.useRealTimers());

    it('should start from the status when it connects', () => {
        status = { paused: false, stopped: false, track: everlong };
        const store = connect();

        expect(store.state()).toEqual({
            active: true,
            playing: true,
            title: 'Everlong',
            artist: 'Foo Fighters',
            album: 'The Colour and the Shape',
            cover: 'https://i.scdn.co/image/ab67616d0000b273abc',
        });
        expect(store.cover()).toBe('https://i.scdn.co/image/ab67616d00001e02abc');
    });

    it('should be inactive without a phone connected', () => {
        const store = connect();

        expect(store.state().active).toBe(false);
        expect(store.cover()).toBe('');
    });

    it('should follow every change right away, without asking', () => {
        const store = connect();
        getStatus.mockClear();

        send({ type: 'active' });
        send({ type: 'metadata', data: everlong });
        send({ type: 'playing' });
        expect(store.state()).toEqual(
            expect.objectContaining({ title: 'Everlong', playing: true }),
        );

        send({ type: 'paused' });
        expect(store.state().playing).toBe(false);

        send({ type: 'playing' });
        send({ type: 'metadata', data: { ...everlong, name: 'Monkey Wrench' } });
        expect(store.state()).toEqual(
            expect.objectContaining({ title: 'Monkey Wrench', playing: true }),
        );

        expect(getStatus).not.toHaveBeenCalled();
    });

    it('should not dim the cover between two songs', () => {
        const store = connect();
        send({ type: 'playing' });

        send({ type: 'not_playing' });

        expect(store.state().playing).toBe(true);
    });

    it('should stop playing when there is nothing more to play', () => {
        const store = connect();
        send({ type: 'playing' });

        send({ type: 'stopped' });

        expect(store.state().playing).toBe(false);
    });

    it('should forget the song when the phone lets go', () => {
        const store = connect();
        send({ type: 'metadata', data: everlong });

        send({ type: 'inactive' });

        expect(store.state()).toEqual(expect.objectContaining({ active: false, title: '' }));
    });

    it('should play every new connection at full volume', () => {
        connect();

        send({ type: 'active' });

        expect(setVolume).toHaveBeenCalledWith(100);
    });

    it('should leave the volume alone otherwise', () => {
        connect();

        send({ type: 'metadata', data: everlong });
        send({ type: 'playing' });
        send({ type: 'volume' });

        expect(setVolume).not.toHaveBeenCalled();
    });

    it('should connect again when the connection closes, and catch up', () => {
        const store = connect();
        connection().complete();

        status = { paused: true, stopped: false, track: everlong };
        vi.advanceTimersByTime(5000);
        send({ type: 'open' });
        settle();

        expect(connections.length).toBe(2);
        expect(store.state()).toEqual(
            expect.objectContaining({ title: 'Everlong', playing: false }),
        );
    });

    describe('with the TV', () => {
        it('should end the session when the TV turns off', () => {
            connect();
            send({ type: 'active' });
            settle();

            TestBed.inject(PowerStore).sleep();
            settle();

            expect(stop).toHaveBeenCalled();
        });

        it('should leave Spotify alone when no phone is connected', () => {
            connect();

            TestBed.inject(PowerStore).sleep();
            settle();

            expect(stop).not.toHaveBeenCalled();
        });

        it('should turn the TV on when music starts while it is off', () => {
            connect();
            TestBed.inject(PowerStore).sleep();
            settle();
            vi.advanceTimersByTime(1000 * 60);

            send({ type: 'playing' });
            send({ type: 'playing' });

            expect(turnOn).toHaveBeenCalledTimes(1);
        });

        it('should not turn the TV right back on just after it turned off', () => {
            connect();
            TestBed.inject(PowerStore).sleep();
            settle();
            vi.advanceTimersByTime(1000 * 5);

            send({ type: 'playing' });

            expect(turnOn).not.toHaveBeenCalled();
        });

        it('should not touch the TV while it shows the Pi', () => {
            connect();

            send({ type: 'playing' });

            expect(turnOn).not.toHaveBeenCalled();
        });

        it('should turn the TV on again after it was on and off again', () => {
            connect();
            const power = TestBed.inject(PowerStore);
            power.sleep();
            settle();
            vi.advanceTimersByTime(1000 * 60);
            send({ type: 'playing' });

            power.wake();
            settle();
            power.sleep();
            settle();
            vi.advanceTimersByTime(1000 * 60);
            send({ type: 'playing' });

            expect(turnOn).toHaveBeenCalledTimes(2);
        });
    });
});
