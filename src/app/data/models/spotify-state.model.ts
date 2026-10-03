// Written by pi/spotify-event.py on every Spotify Connect event
export interface SpotifyState {
    time: number; // unix seconds
    active: boolean; // a phone is connected and has something loaded
    playing: boolean;
    title: string;
    artist: string;
    album: string;
    cover: string; // URL of the album cover
}
