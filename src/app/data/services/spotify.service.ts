import { Observable } from 'rxjs';
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
}

export interface SpotifyStatus {
    paused: boolean;
    stopped: boolean;
    track?: SpotifyTrack | null;
}

// "open" isn't go-librespot's: the connection to it was (re)opened, so anything may have changed
export type SpotifyEvent =
    | { type: 'metadata'; data: SpotifyTrack }
    | { type: 'open' | 'active' | 'inactive' | 'playing' | 'paused' | 'not_playing' | 'stopped' }
    | { type: string; data?: unknown };

@Injectable({ providedIn: 'root' })
export class SpotifyService {
    private readonly http = inject(HttpClient);

    // Null while no phone is connected
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

    // The volume of the connection, from 0 to 100: not of the Pi or the TV
    public setVolume(volume: number): Observable<unknown> {
        return this.http.post(`http://${API}/player/volume`, { volume });
    }

    // Stops and ends the session: the phone lets go of the Pi, like a Bluetooth speaker that's
    // switched off
    public stop(): Observable<unknown> {
        return this.http.post(`http://${API}/player/stop`, null);
    }
}
