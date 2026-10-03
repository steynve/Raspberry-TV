import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SpotifyState } from '@data/models/spotify-state.model';

// Spotify Connect runs on the Pi (spotifyd): this reads its state and controls it, same origin
@Injectable({ providedIn: 'root' })
export class SpotifyService {
    private readonly http = inject(HttpClient);

    public getState(): Observable<SpotifyState> {
        // The file changes with every song, so never let the browser serve it from its cache
        return this.http.get<SpotifyState>('/live/spotify.json', { params: { t: Date.now() } });
    }

    // Pauses and lets go of the phone, see pi/spotify-disconnect.sh
    public disconnect(): Observable<string> {
        return this.http.post('/control/spotify-disconnect', null, { responseType: 'text' });
    }
}
