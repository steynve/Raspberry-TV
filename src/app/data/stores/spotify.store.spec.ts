import { defer, Observable, of, Subject, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { positionNow, SpotifyStore } from './spotify.store';
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
        position: 60000,
        duration: 250000,
    };

    const signedIn = (overrides: Partial<SpotifyStatus> = {}): SpotifyStatus => ({
        username: 'steyn',
        context_uri: 'spotify:playlist:rock',
        paused: false,
        stopped: false,
        track: everlong,
        ...overrides,
    });

    // Each connection to go-librespot is a subject of its own, so a test can close it
    let connections: Subject<SpotifyEvent>[];
    let status: SpotifyStatus | null;
    const getStatus = vi.fn(() => of(status));
    const setVolume = vi.fn(() => of(null));
    const stop = vi.fn(() => of(null));
    const turnOn = vi.fn(() => of('on'));
    const getPlaylists = vi.fn(() =>
        of([{ uri: 'spotify:playlist:rock', name: 'Rock', length: 12 }]),
    );
    const getPairing = vi.fn(() => of({ url: 'https://www.spotify.com/pair', code: 'ABCD' }));
    const play = vi.fn(() => of(null));
    const playPause = vi.fn(() => of(null));
    const next = vi.fn(() => of(null));
    const previous = vi.fn(() => of(null));

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
        vi.setSystemTime(1000000);
        connections = [];
        status = null;
        [getStatus, setVolume, stop, turnOn, getPlaylists, getPairing, play].forEach((spy) =>
            spy.mockClear(),
        );

        TestBed.configureTestingModule({
            providers: [
                {
                    provide: SpotifyService,
                    useValue: {
                        getStatus,
                        setVolume,
                        stop,
                        getPlaylists,
                        getPairing,
                        play,
                        playPause,
                        next,
                        previous,
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
        status = signedIn();
        const store = connect();

        expect(store.state()).toEqual({
            active: true,
            playing: true,
            title: 'Everlong',
            artist: 'Foo Fighters',
            album: 'The Colour and the Shape',
            cover: 'https://i.scdn.co/image/ab67616d0000b273abc',
            context: 'spotify:playlist:rock',
            position: 60000,
            positionAt: 1000000,
            duration: 250000,
        });
        expect(store.cover()).toBe('https://i.scdn.co/image/ab67616d00001e02abc');
    });

    it('should be inactive without a phone connected', () => {
        const store = connect();

        expect(store.state().active).toBe(false);
        expect(store.cover()).toBe('');
    });

    it('should be inactive while signed in with nothing loaded', () => {
        status = signedIn({ track: null, context_uri: null, stopped: true });
        const store = connect();

        expect(store.state().active).toBe(false);
    });

    describe('position', () => {
        it('should run on while playing, and stand still while paused', () => {
            const store = connect();
            send({ type: 'metadata', data: everlong });
            send({ type: 'playing', data: { context_uri: 'spotify:playlist:rock' } });

            vi.advanceTimersByTime(10000);
            expect(positionNow(store.state(), Date.now())).toBe(70000);

            send({ type: 'paused', data: { context_uri: 'spotify:playlist:rock' } });
            vi.advanceTimersByTime(10000);
            expect(positionNow(store.state(), Date.now())).toBe(70000);

            send({ type: 'playing', data: { context_uri: 'spotify:playlist:rock' } });
            vi.advanceTimersByTime(5000);
            expect(positionNow(store.state(), Date.now())).toBe(75000);
        });

        it('should jump with a seek', () => {
            const store = connect();
            send({ type: 'metadata', data: everlong });

            send({ type: 'seek', data: { position: 200000, duration: 250000 } });

            expect(positionNow(store.state(), Date.now())).toBe(200000);
        });

        it('should never pass the end of the song', () => {
            const store = connect();
            send({ type: 'metadata', data: everlong });
            send({ type: 'playing', data: { context_uri: '' } });

            vi.advanceTimersByTime(1000 * 60 * 10);

            expect(positionNow(store.state(), Date.now())).toBe(250000);
        });
    });

    describe('library', () => {
        it('should load the playlists of the account', () => {
            status = signedIn();
            const store = connect();

            store.loadLibrary();

            expect(store.signedIn()).toBe(true);
            expect(store.likedSongs()).toBe('spotify:user:steyn:collection');
            expect(store.playlists().map((playlist) => playlist.name)).toEqual(['Rock']);
            expect(getPairing).not.toHaveBeenCalled();
        });

        it('should show the code to link an account without one', () => {
            const store = connect();

            store.loadLibrary();

            expect(store.signedIn()).toBe(false);
            expect(store.pairing()?.code).toBe('ABCD');
            expect(getPlaylists).not.toHaveBeenCalled();
        });

        it('should show the code while it waits for the account to be linked', () => {
            const store = connect();
            getStatus.mockReturnValueOnce(throwError(() => new Error('503')));

            store.loadLibrary();

            expect(store.signedIn()).toBe(false);
            expect(store.pairing()?.code).toBe('ABCD');
        });

        it('should pass the remote on to Spotify', () => {
            const store = connect();

            store.play('spotify:playlist:rock');
            store.playPause();
            store.next();
            store.previous();

            expect(play).toHaveBeenCalledWith('spotify:playlist:rock');
            expect(playPause).toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
            expect(previous).toHaveBeenCalled();
        });
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

        status = signedIn({ paused: true });
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
