import { Mock, vi } from 'vitest';
import { computed, Signal, signal, WritableSignal } from '@angular/core';
import { PlayedSong } from '@data/stores/radio.store';
import { RadioChannel } from '@data/models/radio-channel.model';

// Like the real list: Spotify first, starting on KINK
const channels: RadioChannel[] = [
    { file: '', visibleName: 'Spotify', apiSrc: 'SPOTIFY', apiRef: '' },
    { file: 'kink.mp3', visibleName: '<i>K</i>INK', apiSrc: 'KINK', apiRef: 'kink' },
    { file: 'reggae.mp3', visibleName: 'Reggae', apiSrc: 'NONE', apiRef: '' },
];

// Stands in for RadioStore in component tests: set its signals, check its calls
export interface RadioStoreMock {
    channels: RadioChannel[];
    spotifyIndex: number;
    firstStation: number;
    channelIndex: WritableSignal<number>;
    channel: Signal<RadioChannel>;
    isSpotify: Signal<boolean>;
    isPlaying: WritableSignal<boolean>;
    song: WritableSignal<string>;
    artist: WritableSignal<string>;
    cover: WritableSignal<string>;
    coverColor: WritableSignal<string | undefined>;
    typedNumber: WritableSignal<string>;
    typedChannel: WritableSignal<RadioChannel | undefined>;
    blocked: WritableSignal<boolean>;
    history: WritableSignal<PlayedSong[]>;
    start: Mock;
    startIfBlocked: Mock;
    playChannel: Mock;
    step: Mock;
    typeDigit: Mock;
    playPause: Mock;
}

export const radioStoreMock = (): RadioStoreMock => {
    const channelIndex = signal(1);

    return {
        channels,
        spotifyIndex: 0,
        firstStation: 1,
        channelIndex,
        channel: computed(() => channels[channelIndex()]),
        isSpotify: computed(() => channelIndex() === 0),
        isPlaying: signal(true),
        song: signal(''),
        artist: signal(''),
        cover: signal(''),
        coverColor: signal<string | undefined>(undefined),
        typedNumber: signal(''),
        typedChannel: signal<RadioChannel | undefined>(undefined),
        blocked: signal(false),
        history: signal<PlayedSong[]>([]),
        start: vi.fn(),
        startIfBlocked: vi.fn(),
        playChannel: vi.fn(),
        step: vi.fn(),
        typeDigit: vi.fn(),
        playPause: vi.fn(),
    };
};
