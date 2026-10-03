import { TestBed } from '@angular/core/testing';
import { Component, computed, signal } from '@angular/core';
import { RadioStore } from '@data/stores/radio.store';
import { SpotifyStore } from '@data/stores/spotify.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TvChannelsComponent } from './tv-channels.component';
import { TvSystemComponent } from '../tv-system/tv-system.component';
import { SpotifyState } from '@data/models/spotify-state.model';
import { SpotifyPairing, SpotifyPlaylist } from '@data/services/spotify.service';
import { radioStoreMock, RadioStoreMock } from '@data/services/mocks/radio-store.mock';
import { spotifyInactiveMock, spotifyStateMock } from '@data/services/mocks/spotify.mock';
import { KeyboardEventKey } from '@data/models/keyboard-event-key.type';
import { ComponentFixture } from '@angular/core/testing';

@Component({ selector: 'app-tv-system', template: '' })
class TvSystemStubComponent {}

describe('TvChannelsComponent', () => {
    let radio: RadioStoreMock;
    let fixture: ComponentFixture<TvChannelsComponent>;
    let closed: ReturnType<typeof vi.fn<() => void>>;
    const spotify = {
        state: signal<SpotifyState>(spotifyInactiveMock),
        signedIn: signal(true),
        pairing: signal<SpotifyPairing | null>(null),
        playlists: signal<SpotifyPlaylist[]>([]),
        likedSongs: computed(() => 'spotify:user:steyn:collection'),
        loadLibrary: vi.fn(),
        play: vi.fn(),
    };

    const playlists: SpotifyPlaylist[] = [
        { uri: 'spotify:playlist:rock', name: 'Rock', length: 120 },
        { uri: 'spotify:playlist:chill', name: 'Chill', length: 45 },
    ];

    const element = (): HTMLElement => fixture.nativeElement;
    const rows = (): string[] =>
        [...element().querySelectorAll('.channel')].map((row) => row.textContent?.trim() ?? '');
    const selected = (): string | undefined =>
        element().querySelector('.channel.selected')?.textContent?.trim();

    const open = (): void => {
        fixture.componentRef.setInput('open', true);
        fixture.detectChanges();
    };

    const press = (...keys: KeyboardEventKey[]): void => {
        keys.forEach((key) => fixture.componentInstance.onKey(key));
        fixture.detectChanges();
    };

    beforeEach(() => {
        radio = radioStoreMock();
        spotify.state.set(spotifyInactiveMock);
        spotify.signedIn.set(true);
        spotify.pairing.set(null);
        spotify.playlists.set(playlists);
        spotify.loadLibrary.mockClear();
        spotify.play.mockClear();

        TestBed.configureTestingModule({
            providers: [
                { provide: RadioStore, useValue: radio },
                { provide: SpotifyStore, useValue: spotify },
            ],
        });
        TestBed.overrideComponent(TvChannelsComponent, {
            remove: { imports: [TvSystemComponent] },
            add: { imports: [TvSystemStubComponent] },
        });

        fixture = TestBed.createComponent(TvChannelsComponent);
        closed = vi.fn<() => void>();
        fixture.componentInstance.closed.subscribe(() => closed());
        fixture.detectChanges();
    });

    it('should open on the stations, with the one playing highlighted', () => {
        radio.channelIndex.set(2);
        open();

        expect(rows()).toEqual(['Spotify', 'KINK', 'Reggae']);
        expect(selected()).toBe('Reggae');
        expect(element().querySelector('.channels')?.classList).toContain('open');
    });

    it('should have Spotify one press up from where the TV starts', () => {
        open();
        expect(selected()).toBe('KINK');

        press('ArrowUp');
        expect(selected()).toBe('Spotify');
    });

    it('should move the highlight, without going past either end', () => {
        open();

        press('ArrowUp', 'ArrowUp');
        expect(selected()).toBe('Spotify');

        press('ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown');
        expect(selected()).toBe('Reggae');
    });

    it('should play the station picked, and close', () => {
        open();

        press('ArrowDown', 'Enter');

        expect(radio.playChannel).toHaveBeenCalledWith(2);
        expect(closed).toHaveBeenCalled();
    });

    it('should close on Back', () => {
        open();

        press('Backspace');

        expect(closed).toHaveBeenCalled();
    });

    describe('Spotify', () => {
        it('should open as a folder of Liked Songs and the playlists', () => {
            open();

            press('ArrowUp', 'Enter');

            expect(spotify.loadLibrary).toHaveBeenCalled();
            expect(rows()).toEqual(['Liked Songs', 'Rock120', 'Chill45']);
            expect(selected()).toBe('Liked Songs');
            expect(closed).not.toHaveBeenCalled();
        });

        it('should play the playlist picked, and close', () => {
            open();

            press('ArrowUp', 'Enter', 'ArrowDown', 'Enter');

            expect(spotify.play).toHaveBeenCalledWith('spotify:playlist:rock');
            expect(closed).toHaveBeenCalled();
        });

        it('should play Liked Songs from the account', () => {
            open();

            press('ArrowUp', 'Enter', 'Enter');

            expect(spotify.play).toHaveBeenCalledWith('spotify:user:steyn:collection');
        });

        it('should go back to the stations on Back, on Spotify', () => {
            open();

            press('ArrowUp', 'Enter', 'Backspace');

            expect(rows()).toEqual(['Spotify', 'KINK', 'Reggae']);
            expect(selected()).toBe('Spotify');
            expect(closed).not.toHaveBeenCalled();
        });

        it('should open straight on what plays while Spotify is the channel', () => {
            radio.channelIndex.set(0);
            spotify.state.set(spotifyStateMock({ context: 'spotify:playlist:chill' }));
            open();

            expect(selected()).toBe('Chill');
            expect(element().querySelector('[aria-current] .channel-playing')).toBeTruthy();
        });

        it('should show the code to link an account, and play nothing without one', () => {
            spotify.signedIn.set(false);
            spotify.pairing.set({ url: 'https://www.spotify.com/pair?code=ABCD', code: 'ABCD' });
            open();

            press('ArrowUp', 'Enter');
            expect(element().querySelector('.pairing-code')?.textContent).toBe('ABCD');

            press('Enter');
            expect(spotify.play).not.toHaveBeenCalled();
        });
    });
});
