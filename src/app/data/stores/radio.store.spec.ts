import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { RadioStore } from './radio.store';
import { PowerStore } from './power.store';
import { SpotifyStore } from './spotify.store';
import { RadioService } from '@data/services/radio.service';
import { NowPlaying } from '@data/models/radio-channel.model';
import { SpotifyState } from '@data/models/spotify-state.model';
import { RadioServiceMock } from '@data/services/mocks/radio.service.mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spotifyInactiveMock, spotifyStateMock } from '@data/services/mocks/spotify.mock';

describe('RadioStore', () => {
    let radioService: RadioServiceMock;
    let spotify: {
        state: ReturnType<typeof signal<SpotifyState>>;
        cover: ReturnType<typeof signal<string>>;
        coverColor: ReturnType<typeof signal<string | undefined>>;
        disconnect: ReturnType<typeof vi.fn>;
        playPause: ReturnType<typeof vi.fn>;
    };

    const play = vi.mocked(HTMLMediaElement.prototype.play);
    const pause = vi.mocked(HTMLMediaElement.prototype.pause);

    // The stream the store last started, from the audio element it called play() on
    const streaming = (): string => (play.mock.contexts.at(-1) as HTMLAudioElement)?.src ?? '';

    // Lets effects and the first (zero-delay) poll run
    const settle = (): void => {
        TestBed.tick();
        vi.advanceTimersByTime(0);
    };

    const create = (): RadioStore => {
        const store = TestBed.inject(RadioStore);
        store.start();
        settle();
        return store;
    };

    beforeEach(() => {
        vi.useFakeTimers();
        play.mockClear();
        pause.mockClear();
        spotify = {
            state: signal(spotifyInactiveMock),
            cover: signal(''),
            coverColor: signal<string | undefined>(undefined),
            disconnect: vi.fn(),
            playPause: vi.fn(),
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: RadioService, useClass: RadioServiceMock },
                { provide: SpotifyStore, useValue: spotify },
            ],
        });
        radioService = TestBed.inject(RadioService) as unknown as RadioServiceMock;
    });

    afterEach(() => vi.useRealTimers());

    it('should play the first station after Spotify, at half volume, with its song', () => {
        const store = create();

        expect(store.channelIndex()).toBe(store.firstStation);
        expect(streaming()).toBe(radioService.radioChannels[1].file);
        expect((play.mock.contexts.at(-1) as HTMLAudioElement).volume).toBe(0.5);
        expect(store.song()).toBe('kink_song');
        expect(store.artist()).toBe('kink_artist');
    });

    it('should switch stations', () => {
        const store = create();

        store.playChannel(2);

        expect(store.channel().apiSrc).toBe('FLUX');
        expect(streaming()).toBe(radioService.radioChannels[2].file);
    });

    it('should ignore stations that do not exist', () => {
        const store = create();

        store.playChannel(42);

        expect(store.channelIndex()).toBe(1);
    });

    it('should step round the list with channel up and down', () => {
        const store = create();

        store.step(-1);
        expect(store.isSpotify()).toBe(true);

        store.step(-1);
        expect(store.channelIndex()).toBe(radioService.radioChannels.length - 1);

        store.step(1);
        expect(store.channelIndex()).toBe(0);
    });

    describe('numbers', () => {
        it('should play a number that cannot get longer right away', () => {
            const store = create();

            store.typeDigit('3');

            expect(store.channelIndex()).toBe(2);
            expect(store.typedNumber()).toBe('');
        });

        it('should wait for a second digit while one could follow, like a TV', () => {
            radioService.radioChannels = Array.from({ length: 14 }, (_, i) => ({
                ...radioService.radioChannels[1],
                file: `station-${i}.mp3`,
            }));
            const store = create();

            store.typeDigit('1');
            expect(store.typedNumber()).toBe('1');
            expect(store.typedChannel()?.file).toBe('station-0.mp3');

            store.typeDigit('2');
            expect(store.channelIndex()).toBe(11);

            store.typeDigit('1');
            vi.advanceTimersByTime(1500);
            expect(store.channelIndex()).toBe(0);
        });

        it('should ignore 0 on its own', () => {
            const store = create();

            store.typeDigit('0');

            expect(store.typedNumber()).toBe('');
            expect(store.channelIndex()).toBe(1);
        });
    });

    describe('yellow button', () => {
        it('should stop the radio, and start it again live', () => {
            const store = create();
            const plays = play.mock.calls.length;

            store.playPause();
            expect(pause).toHaveBeenCalled();

            store.playPause();
            expect(play.mock.calls.length).toBe(plays + 1);
        });

        it('should pause and resume Spotify', () => {
            const store = create();
            spotify.state.set(spotifyStateMock());
            settle();

            store.playPause();

            expect(spotify.playPause).toHaveBeenCalled();
        });
    });

    describe('Spotify', () => {
        it('should take over from the radio when it plays', () => {
            const store = create();

            spotify.state.set(spotifyStateMock());
            settle();

            expect(store.isSpotify()).toBe(true);
            expect(store.song()).toBe('Everlong');
            expect(pause).toHaveBeenCalled();
        });

        it('should go back to the first station when it lets go', () => {
            const store = create();
            store.playChannel(2);
            spotify.state.set(spotifyStateMock());
            settle();

            spotify.state.set(spotifyInactiveMock);
            settle();

            expect(store.channelIndex()).toBe(store.firstStation);
            expect(streaming()).toBe(radioService.radioChannels[1].file);
        });

        it('should wait for the TV before playing the first station again', () => {
            const store = create();
            spotify.state.set(spotifyStateMock());
            settle();
            TestBed.inject(PowerStore).sleep();
            settle();
            const plays = play.mock.calls.length;

            spotify.state.set(spotifyInactiveMock);
            settle();

            expect(store.channelIndex()).toBe(store.firstStation);
            expect(play.mock.calls.length).toBe(plays);
        });

        it('should let go of Spotify when a station takes over', () => {
            const store = create();
            spotify.state.set(spotifyStateMock());
            settle();

            store.playChannel(2);

            expect(spotify.disconnect).toHaveBeenCalled();
        });

        it('should stay on the station that took over', () => {
            const store = create();
            spotify.state.set(spotifyStateMock());
            settle();
            store.playChannel(2);

            spotify.state.set(spotifyInactiveMock);
            settle();

            expect(store.channelIndex()).toBe(2);
        });

        it('should play nothing itself when Spotify is picked', () => {
            const store = create();

            store.playChannel(store.spotifyIndex);

            expect(store.isSpotify()).toBe(true);
            expect(pause).toHaveBeenCalled();
            expect(store.song()).toBe('');
        });
    });

    describe('with the TV', () => {
        it('should drop the stream while the TV is off, and pick it up again', () => {
            create();
            const power = TestBed.inject(PowerStore);

            power.sleep();
            settle();
            expect(pause).toHaveBeenCalled();

            const plays = play.mock.calls.length;
            power.wake();
            settle();
            expect(play.mock.calls.length).toBe(plays + 1);
        });

        it('should come back on the first station after Spotify', () => {
            const store = create();
            spotify.state.set(spotifyStateMock());
            settle();

            TestBed.inject(PowerStore).sleep();
            settle();

            expect(store.channelIndex()).toBe(store.firstStation);
        });
    });

    it('should wait for a key press when the browser blocks autoplay', async () => {
        play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'));
        const store = create();
        await vi.waitFor(() => expect(store.blocked()).toBe(true));

        store.startIfBlocked();
        await vi.waitFor(() => expect(store.blocked()).toBe(false));
    });

    it('should keep the last 5 songs, newest first', () => {
        const store = create();

        for (let i = 1; i <= 7; i++) {
            radioService.nowPlaying = { song: `song ${i}`, artist: 'artist' };
            vi.advanceTimersByTime(1000 * 30);
        }

        expect(store.history().map((played) => played.song)).toEqual([
            'song 6',
            'song 5',
            'song 4',
            'song 3',
            'song 2',
        ]);
    });

    it('should not show a late song from the station it just left', () => {
        const late = new Subject<NowPlaying>();
        const store = create();
        vi.spyOn(radioService as unknown as RadioService, 'getNowPlaying').mockImplementation(
            (channel) =>
                channel.apiSrc === 'KINK' ? late : of({ song: 'flux_song', artist: 'flux_artist' }),
        );

        vi.advanceTimersByTime(1000 * 30); // asks KINK, which takes its time
        store.playChannel(2);
        late.next({ song: 'kink_song_late', artist: 'kink_artist' });

        expect(store.song()).toBe('flux_song');
    });

    it('should poll the song every 30 seconds while the TV is on', () => {
        create();
        const getNowPlaying = vi
            .spyOn(radioService, 'getNowPlaying')
            .mockReturnValue(of(radioService.nowPlaying));

        vi.advanceTimersByTime(1000 * 60);
        expect(getNowPlaying).toHaveBeenCalledTimes(2);

        TestBed.inject(PowerStore).sleep();
        settle();
        vi.advanceTimersByTime(1000 * 60 * 5);
        expect(getNowPlaying).toHaveBeenCalledTimes(2);
    });
});
