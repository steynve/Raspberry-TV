// What Spotify Connect on the Pi plays, see SpotifyStore
export interface SpotifyState {
    active: boolean; // a phone is connected
    playing: boolean;
    title: string;
    artist: string;
    album: string;
    cover: string; // URL of the album cover
}
