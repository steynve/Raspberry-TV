import { SpotifyState } from '@data/models/spotify-state.model';

// Everlong, playing from a phone
export const spotifyStateMock = (overrides: Partial<SpotifyState> = {}): SpotifyState => ({
    active: true,
    playing: true,
    title: 'Everlong',
    artist: 'Foo Fighters',
    album: '',
    cover: '',
    ...overrides,
});

// No phone connected
export const spotifyInactiveMock: SpotifyState = spotifyStateMock({
    active: false,
    playing: false,
    title: '',
    artist: '',
});
