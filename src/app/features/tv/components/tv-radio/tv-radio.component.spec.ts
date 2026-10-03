import { Subject } from 'rxjs';
import { Component, signal } from '@angular/core';
import { TvRadioComponent } from './tv-radio.component';
import { TvSystemComponent } from '../tv-system/tv-system.component';
import { RadioService } from '@data/services/radio.service';
import { PowerStore } from '@data/stores/power.store';
import { SpotifyStore } from '@data/stores/spotify.store';
import { SpotifyState } from '@data/models/spotify-state.model';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeyboardEventKey } from '@data/models/keyboard-event-key.type';
import { RadioServiceMock } from '@data/services/mocks/radio.service.mock';
import { spotifyInactiveMock, spotifyStateMock } from '@data/services/mocks/spotify.mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

@Component({ selector: 'app-tv-system', template: '' })
class TvSystemStubComponent {}

describe('TvRadioComponent', () => {
    let component: TvRadioComponent;
    let fixture: ComponentFixture<TvRadioComponent>;
    let radioService: RadioServiceMock;
    let keyDownSubject: Subject<KeyboardEventKey>;
    let spotify: {
        state: ReturnType<typeof signal<SpotifyState>>;
        cover: ReturnType<typeof signal<string>>;
        coverColor: ReturnType<typeof signal<string | undefined>>;
        disconnect: ReturnType<typeof vi.fn>;
    };

    const spotifyPlaying = (playing = true): SpotifyState =>
        spotifyStateMock({ playing, album: 'The Colour and the Shape' });

    beforeEach(async () => {
        vi.useFakeTimers();
        spotify = {
            state: signal<SpotifyState>(spotifyInactiveMock),
            cover: signal(''),
            coverColor: signal<string | undefined>(undefined),
            disconnect: vi.fn(),
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: RadioService, useClass: RadioServiceMock },
                { provide: SpotifyStore, useFactory: (): typeof spotify => spotify },
            ],
        });
        TestBed.overrideComponent(TvRadioComponent, {
            remove: { imports: [TvSystemComponent] },
            add: { imports: [TvSystemStubComponent] },
        });

        radioService = TestBed.inject(RadioService) as unknown as RadioServiceMock;
        vi.spyOn(radioService, 'getNowPlaying');

        keyDownSubject = new Subject<KeyboardEventKey>();
        fixture = TestBed.createComponent(TvRadioComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('keyDownSubject', keyDownSubject);
        fixture.componentRef.setInput('overlay', true);
        fixture.detectChanges();
        await fixture.whenStable();
        vi.advanceTimersByTime(0);
    });

    afterEach(() => vi.useRealTimers());

    const audio = (): HTMLAudioElement => fixture.nativeElement.querySelector('audio');

    // Every API response is a new object, like the real thing
    const playOnKink = (song: string, artist: string): void => {
        radioService.nowPlaying = { song, artist };
    };

    it('should start the first channel after the first render', () => {
        expect(audio().src).toBe(radioService.radioChannels[0].file);
        expect(audio().volume).toBe(0.5);
        expect(audio().play).toHaveBeenCalled();
    });

    describe('Spotify', () => {
        const spotifyIndex = (): number => radioService.radioChannels.length - 1;

        it('should be the last channel', () => {
            expect(component.spotifyChannelIndex).toBe(spotifyIndex());
            expect(radioService.radioChannels[spotifyIndex()].apiSrc).toBe('SPOTIFY');
        });

        it('should take over from the radio when the phone starts playing', () => {
            spotify.state.set(spotifyPlaying());
            fixture.detectChanges();

            expect(component.isSpotify()).toBe(true);
            expect(component.selectedChannelIndex()).toBe(spotifyIndex());
            expect(audio().hasAttribute('src')).toBe(false);
            expect(component.nowPlayingSong()).toBe('Everlong');
            expect(component.nowPlayingArtist()).toBe('Foo Fighters');
            expect(component.isPlaying()).toBe(true);
            expect(fixture.nativeElement.querySelector('.song').textContent).toBe('Everlong');
        });

        it('should show the cover, and tint the widget with its colour', () => {
            spotify.state.set(spotifyPlaying());
            spotify.cover.set('https://i.scdn.co/image/cover');
            spotify.coverColor.set('rgb(200 40 40)');
            fixture.detectChanges();

            const widget: HTMLElement = fixture.nativeElement.querySelector('.now-playing');
            expect(widget.querySelector<HTMLImageElement>('.cover')?.src).toBe(
                'https://i.scdn.co/image/cover',
            );
            expect(widget.classList).toContain('cover-tinted');
            expect(widget.style.getPropertyValue('--cover-color')).toBe('rgb(200 40 40)');
        });

        it('should take over while the TV is off, so the radio stays quiet when casting turns it on', () => {
            const power = TestBed.inject(PowerStore);
            power.sleep();
            TestBed.tick();

            spotify.state.set(spotifyPlaying());
            fixture.detectChanges();
            power.wake();
            TestBed.tick();

            expect(component.isSpotify()).toBe(true);
            expect(audio().hasAttribute('src')).toBe(false);
        });

        it('should show when Spotify is paused on the phone', () => {
            spotify.state.set(spotifyPlaying());
            fixture.detectChanges();
            spotify.state.set(spotifyPlaying(false));
            fixture.detectChanges();

            expect(component.isSpotify()).toBe(true);
            expect(component.isPlaying()).toBe(false);
        });

        it('should let go of the phone when a radio station is picked, playing or paused', () => {
            spotify.state.set(spotifyPlaying(false));
            fixture.detectChanges();

            component.setSelectedChannel(0);
            component.setNowPlayingChannel();

            expect(spotify.disconnect).toHaveBeenCalled();
            expect(audio().src).toBe(radioService.radioChannels[0].file);
        });

        it('should explain how to cast when Spotify is picked without anything playing', () => {
            component.setSelectedChannel(spotifyIndex());
            component.setNowPlayingChannel();
            fixture.detectChanges();

            expect(audio().hasAttribute('src')).toBe(false);
            expect(fixture.nativeElement.querySelector('.hint').textContent).toContain(
                'pick Raspberry',
            );
        });

        it('should go back to the first station when the phone lets go', () => {
            fixture.componentRef.setInput('overlay', false);
            keyDownSubject.next('3');
            spotify.state.set(spotifyPlaying());
            fixture.detectChanges();
            expect(component.isSpotify()).toBe(true);

            spotify.state.set(spotifyInactiveMock);
            fixture.detectChanges();

            expect(component.nowPlayingChannelIndex()).toBe(0);
            expect(audio().src).toBe(radioService.radioChannels[0].file);
            expect(component.nowPlayingSong()).toBe('kink_song');
        });

        it('should wait for the TV before playing the first station again', () => {
            spotify.state.set(spotifyPlaying());
            fixture.detectChanges();
            const power = TestBed.inject(PowerStore);
            power.sleep();
            TestBed.tick();
            const plays = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;

            spotify.state.set(spotifyInactiveMock);
            fixture.detectChanges();

            expect(component.nowPlayingChannelIndex()).toBe(0);
            expect(vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length).toBe(plays);
        });

        it('should stay on the station that took over from Spotify', () => {
            spotify.state.set(spotifyPlaying());
            fixture.detectChanges();
            component.playChannel(2);

            spotify.state.set(spotifyInactiveMock);
            fixture.detectChanges();

            expect(component.nowPlayingChannelIndex()).toBe(2);
        });

        it('should add Spotify songs to the history', () => {
            spotify.state.set(spotifyPlaying());
            fixture.detectChanges();
            spotify.state.set(spotifyStateMock({ title: 'Monkey Wrench' }));
            fixture.detectChanges();

            expect(component.history()[0]).toEqual(
                expect.objectContaining({ song: 'Everlong', station: 'Spotify' }),
            );
        });
    });

    describe('remote shortcuts', () => {
        const press = (key: KeyboardEventKey): void => {
            fixture.componentRef.setInput('overlay', false);
            keyDownSubject.next(key);
        };

        it('should switch straight to a station on its number', () => {
            press('3');

            expect(component.nowPlayingChannelIndex()).toBe(2);
            expect(audio().src).toBe(radioService.radioChannels[2].file);
        });

        it('should wait for a second digit when the number could go on, like a TV', () => {
            // 12 stations: 1 could become 10, 11 or 12
            const extra = radioService.radioChannels[0]; // The mock only answers like KINK
            component.radioChannels.push(...Array.from({ length: 7 }, () => extra));
            press('5');

            press('1');
            fixture.detectChanges();
            expect(component.nowPlayingChannelIndex()).toBe(4);
            expect(fixture.nativeElement.querySelector('.channel-number.typing').textContent).toBe(
                '1',
            );

            press('2');
            expect(component.nowPlayingChannelIndex()).toBe(11);

            press('1');
            vi.advanceTimersByTime(1500);
            expect(component.nowPlayingChannelIndex()).toBe(0);
            expect(component.typedNumber()).toBe('');
        });

        it('should go round the list with channel up and down', () => {
            press('PageDown');
            expect(component.nowPlayingChannelIndex()).toBe(radioService.radioChannels.length - 1);

            press('PageUp');
            expect(component.nowPlayingChannelIndex()).toBe(0);
        });

        it('should go back and forth between the last two stations on yellow', () => {
            press('3');
            press('F18');
            expect(component.nowPlayingChannelIndex()).toBe(0);

            press('F18');
            expect(component.nowPlayingChannelIndex()).toBe(2);
        });
    });

    describe('when the TV turns off or switches away', () => {
        it('should drop the stream and stop asking what is playing', () => {
            const power = TestBed.inject(PowerStore);
            const calls = vi.mocked(radioService.getNowPlaying).mock.calls.length;

            power.sleep();
            TestBed.tick();

            expect(audio().hasAttribute('src')).toBe(false);
            expect(audio().load).toHaveBeenCalled();

            vi.advanceTimersByTime(1000 * 60 * 5);
            expect(radioService.getNowPlaying).toHaveBeenCalledTimes(calls);
        });

        it('should go back to the first station when it was on Spotify', () => {
            spotify.state.set(spotifyPlaying());
            fixture.detectChanges();
            const power = TestBed.inject(PowerStore);

            power.sleep();
            TestBed.tick();
            expect(component.nowPlayingChannelIndex()).toBe(0);
            expect(audio().hasAttribute('src')).toBe(false);

            // Spotify has let go of the phone by then (see SpotifyStore)
            spotify.state.set(spotifyInactiveMock);
            power.wake();
            TestBed.tick();
            expect(audio().src).toBe(radioService.radioChannels[0].file);
        });

        it('should stay on the station it was on otherwise', () => {
            // A sixth station, like KINK: the mock only answers like KINK
            component.radioChannels.push(radioService.radioChannels[0]);
            fixture.componentRef.setInput('overlay', false);
            keyDownSubject.next('6');
            const power = TestBed.inject(PowerStore);

            power.sleep();
            TestBed.tick();

            expect(component.nowPlayingChannelIndex()).toBe(5);
        });

        it('should pick the stream up again, and ask what is playing right away', () => {
            const power = TestBed.inject(PowerStore);
            power.sleep();
            TestBed.tick();
            const calls = vi.mocked(radioService.getNowPlaying).mock.calls.length;

            power.wake();
            TestBed.tick();
            vi.advanceTimersByTime(0);

            expect(audio().src).toBe(radioService.radioChannels[0].file);
            expect(radioService.getNowPlaying).toHaveBeenCalledTimes(calls + 1);
        });
    });

    describe('when the browser blocks autoplay', () => {
        const block = (): void => {
            vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
                new DOMException('play() failed', 'NotAllowedError'),
            );
        };

        it('should ask for a key press and start on the first one', async () => {
            block();
            component.startRadio();
            await vi.waitFor(() => expect(component.blocked()).toBe(true));
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.blocked')).toBeTruthy();

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            await vi.waitFor(() => expect(component.blocked()).toBe(false));
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelector('.blocked')).toBeNull();
        });

        it('should also start on a click', async () => {
            block();
            component.startRadio();
            await vi.waitFor(() => expect(component.blocked()).toBe(true));
            const plays = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;

            document.dispatchEvent(new Event('pointerdown'));

            expect(vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length).toBe(plays + 1);
        });

        it('should ignore other playback errors', async () => {
            vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
                new DOMException('interrupted', 'AbortError'),
            );
            component.startRadio();
            await Promise.resolve();
            await Promise.resolve();

            expect(component.blocked()).toBe(false);
        });

        it('should leave key presses alone when audio plays', () => {
            const plays = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

            expect(vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length).toBe(plays);
        });
    });

    it('should fetch what is playing on init and every 30 seconds', () => {
        expect(radioService.getNowPlaying).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1000 * 30);

        expect(radioService.getNowPlaying).toHaveBeenCalledTimes(2);
    });

    it('should reflect the audio playback state', () => {
        audio().dispatchEvent(new Event('playing'));
        fixture.detectChanges();
        expect(component.playing()).toBe(true);
        expect(fixture.nativeElement.querySelector('.playing-icon').classList).toContain('active');

        audio().dispatchEvent(new Event('waiting'));
        expect(component.playing()).toBe(false);
    });

    it('should mark the playing channel in the list', () => {
        const items = fixture.nativeElement.querySelectorAll('.channel');

        expect(items[0].getAttribute('aria-current')).toBe('true');
        expect(items[1].getAttribute('aria-current')).toBeNull();
    });

    it('should open the channel list with the overlay', () => {
        const channels = fixture.nativeElement.querySelector('.channels');

        expect(channels.classList).toContain('open');

        fixture.componentRef.setInput('overlay', false);
        fixture.detectChanges();

        expect(channels.classList).not.toContain('open');
    });

    describe('history', () => {
        it('should say there is nothing yet', () => {
            expect(fixture.nativeElement.querySelector('.history-empty')).toBeTruthy();
        });

        it('should move the previous song to the history when a new one starts', () => {
            // The first response (KINK) is the current song, so the history is still empty
            expect(component.history()).toEqual([]);

            playOnKink('next_song', 'next_artist');
            vi.advanceTimersByTime(1000 * 30);
            fixture.detectChanges();

            expect(component.history()).toEqual([
                expect.objectContaining({
                    song: 'kink_song',
                    artist: 'kink_artist',
                    station: 'KINK',
                }),
            ]);
            expect(fixture.nativeElement.querySelector('.played-song').textContent).toBe(
                'kink_song',
            );
        });

        it('should not repeat a song that is still playing', () => {
            vi.advanceTimersByTime(1000 * 30 * 3);

            expect(component.history()).toEqual([]);
        });

        it('should keep the last 5 songs', () => {
            for (let i = 0; i < 8; i++) {
                playOnKink(`song ${i}`, 'artist');
                vi.advanceTimersByTime(1000 * 30);
            }

            expect(component.history().map((played) => played.song)).toEqual([
                'song 6',
                'song 5',
                'song 4',
                'song 3',
                'song 2',
            ]);
        });
    });

    describe('nowPlayingSong / nowPlayingArtist', () => {
        it("should show the station's song", () => {
            component.nowPlaying.set({ song: 'kink_song', artist: 'kink_artist' });

            expect(component.nowPlayingSong()).toBe('kink_song');
            expect(component.nowPlayingArtist()).toBe('kink_artist');
        });

        it('should return empty strings when nothing is known', () => {
            component.nowPlaying.set(undefined);

            expect(component.nowPlayingSong()).toBe('');
            expect(component.nowPlayingArtist()).toBe('');
        });
    });

    describe('setSelectedChannel()', () => {
        it('should set selectedChannelIndex', () => {
            component.setSelectedChannel(2);
            expect(component.selectedChannelIndex()).toBe(2);
        });

        it('should ignore indexes out of range', () => {
            component.setSelectedChannel(-1);
            component.setSelectedChannel(radioService.radioChannels.length);

            expect(component.selectedChannelIndex()).toBe(0);
        });
    });

    describe('setNowPlayingChannel()', () => {
        it('should play the selected channel', () => {
            component.setSelectedChannel(1);

            component.setNowPlayingChannel();

            expect(component.nowPlayingChannelIndex()).toBe(1);
            expect(audio().src).toBe(radioService.radioChannels[1].file);
            expect(radioService.getNowPlaying).toHaveBeenLastCalledWith(
                radioService.radioChannels[1],
            );
        });
    });

    describe('keyboard', () => {
        it('should ignore keys when the overlay is closed', () => {
            fixture.componentRef.setInput('overlay', false);
            fixture.detectChanges();

            keyDownSubject.next('ArrowDown');

            expect(component.selectedChannelIndex()).toBe(0);
        });

        it('should move the selection with "ArrowDown" and "ArrowUp"', () => {
            keyDownSubject.next('ArrowDown');
            keyDownSubject.next('ArrowDown');
            expect(component.selectedChannelIndex()).toBe(2);

            keyDownSubject.next('ArrowUp');
            expect(component.selectedChannelIndex()).toBe(1);
        });

        it('should play the selected channel on "Enter"', () => {
            keyDownSubject.next('ArrowDown');
            keyDownSubject.next('Enter');

            expect(component.nowPlayingChannelIndex()).toBe(1);
        });

        it('should reset the selection to the playing channel on "Backspace"', () => {
            keyDownSubject.next('ArrowDown');
            keyDownSubject.next('Backspace');

            expect(component.selectedChannelIndex()).toBe(0);
        });

        it('should render the selected channel', () => {
            keyDownSubject.next('ArrowDown');
            fixture.detectChanges();

            const items = fixture.nativeElement.querySelectorAll('.channel');

            expect(items[1].classList).toContain('selected');
            expect(items[0].classList).not.toContain('selected');
        });
    });
});
