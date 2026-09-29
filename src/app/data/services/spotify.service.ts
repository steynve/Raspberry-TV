import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { SpotifyState } from '@data/models/spotify-state.model';
import { SpotifyStateSerializer } from '@data/serializers/spotify-state.serializer';

// Spotify Connect runs on the Pi (spotifyd): this reads its state and controls it, same origin
@Injectable({
    providedIn: 'root',
})
export class SpotifyService extends HttpService<SpotifyState> {
    constructor() {
        super();

        this.setBaseUrl('/');
        this.setResource('live/spotify.json');
        this.setSerializer(new SpotifyStateSerializer());
    }

    public getState(): Observable<SpotifyState> {
        // The file changes with every song, so never let the browser serve it from its cache
        this.setParams({ t: Date.now() });
        return this.read();
    }

    // Pauses and lets go of the phone, see pi/spotify-disconnect.sh
    public disconnect(): Observable<string> {
        return this.http.post('/control/spotify-disconnect', null, { responseType: 'text' });
    }
}
