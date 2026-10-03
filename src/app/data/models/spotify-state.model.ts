// What Spotify Connect on the Pi plays, see SpotifyStore
export interface SpotifyState {
    active: boolean; // the Pi is the Spotify device, with a song loaded
    playing: boolean;
    title: string;
    artist: string;
    album: string;
    cover: string; // URL of the album cover
    context: string; // URI of the playlist or album it plays from
    // Where in the song it was at positionAt (ms since 1970), and how long the song is, in ms
    position: number;
    positionAt: number;
    duration: number;
}
