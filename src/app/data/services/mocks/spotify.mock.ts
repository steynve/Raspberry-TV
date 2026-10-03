import { SpotifyState } from '@data/models/spotify-state.model';
import { INACTIVE } from '@data/stores/spotify.store';

// Everlong, playing from a phone, a minute into its 4:10
export const spotifyStateMock = (overrides: Partial<SpotifyState> = {}): SpotifyState => ({
    active: true,
    playing: true,
    title: 'Everlong',
    artist: 'Foo Fighters',
    album: '',
    cover: '',
    context: 'spotify:playlist:rock',
    position: 60000,
    positionAt: 0,
    duration: 250000,
    ...overrides,
});

// Nothing loaded
export const spotifyInactiveMock: SpotifyState = INACTIVE;
