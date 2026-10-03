import { map, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

// go-librespot on the Pi, see pi/go-librespot.yml. Only reachable from the Pi itself.
const API = 'localhost:3678';

// The parts of go-librespot's API the app uses, see its API.md and api-spec.yml
export interface SpotifyTrack {
    name: string;
    artist_names: string[];
    album_name: string;
    album_cover_url: string | null;
    position: number; // ms
    duration: number; // ms
}

export interface SpotifyStatus {
    username: string;
    context_uri: string | null; // the playlist or album it plays from
    paused: boolean;
    stopped: boolean;
    track: SpotifyTrack | null;
}

export interface SpotifyPlaylist {
    uri: string;
    name: string;
    length: number; // songs
}

// Where to link the Pi to a Spotify account, while it waits for that
export interface SpotifyPairing {
    url: string;
    code: string;
}

// "open" isn't go-librespot's: the connection to it was (re)opened, so anything may have changed
export type SpotifyEvent =
    | { type: 'metadata'; data: SpotifyTrack }
    | { type: 'seek'; data: { position: number; duration: number } }
    | { type: 'playing' | 'paused' | 'will_play'; data: { context_uri: string } }
    | { type: 'open' | 'active' | 'inactive' | 'not_playing' | 'stopped' }
    | { type: string; data?: unknown };

@Injectable({ providedIn: 'root' })
export class SpotifyService {
    private readonly http = inject(HttpClient);

    // Null while it isn't signed in to Spotify
    public getStatus(): Observable<SpotifyStatus | null> {
        return this.http.get<SpotifyStatus | null>(`http://${API}/status`);
    }

    // Every change as it happens, pushed by go-librespot. Completes when the connection closes.
    public events(): Observable<SpotifyEvent> {
        return new Observable<SpotifyEvent>((subscriber) => {
            const socket = new WebSocket(`ws://${API}/events`);

            socket.onopen = (): void => subscriber.next({ type: 'open' });
            socket.onmessage = (message: MessageEvent<string>): void =>
                subscriber.next(JSON.parse(message.data));
            // A failed connection closes as well
            socket.onclose = (): void => subscriber.complete();

            return (): void => {
                socket.onclose = null;
                socket.close();
            };
        });
    }

    // The playlists in the account's library, in the order the user arranged them. Without the
    // ones with no name or no songs: mixes Spotify made once and no longer serves (404 on play).
    public getPlaylists(): Observable<SpotifyPlaylist[]> {
        return this.http
            .get<{ items: SpotifyPlaylist[] }>(`http://${API}/library/playlists`, {
                params: { limit: 500 },
            })
            .pipe(map(({ items }) => items.filter((playlist) => playlist.name && playlist.length)));
    }

    // Null when it doesn't wait for one
    public getPairing(): Observable<SpotifyPairing | null> {
        return this.http.get<SpotifyPairing | null>(`http://${API}/auth/code`);
    }

    // A playlist, album or Liked Songs ("spotify:user:<username>:collection"), from the start
    public play(uri: string): Observable<unknown> {
        return this.http.post(`http://${API}/player/play`, { uri });
    }

    public playPause(): Observable<unknown> {
        return this.http.post(`http://${API}/player/playpause`, null);
    }

    public next(): Observable<unknown> {
        return this.http.post(`http://${API}/player/next`, null);
    }

    public previous(): Observable<unknown> {
        return this.http.post(`http://${API}/player/prev`, null);
    }

    // The volume of the connection, from 0 to 100: not of the Pi or the TV
    public setVolume(volume: number): Observable<unknown> {
        return this.http.post(`http://${API}/player/volume`, { volume });
    }

    // Stops and ends the session: a phone lets go of the Pi, like a Bluetooth speaker that's
    // switched off. The Pi signs in again with its own account (see pi/go-librespot.yml).
    public stop(): Observable<unknown> {
        return this.http.post(`http://${API}/player/stop`, null);
    }
}
