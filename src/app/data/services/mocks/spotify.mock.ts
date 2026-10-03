import { SpotifyState } from '@data/models/spotify-state.model';

// Everlong, playing from a phone
export const spotifyStateMock = (overrides: Partial<SpotifyState> = {}): SpotifyState => ({
    time: 1,
    active: true,
    playing: true,
    title: 'Everlong',
    artist: 'Foo Fighters',
    album: '',
    cover: '',
    ...overrides,
});
