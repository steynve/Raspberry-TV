import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, EMPTY, map, Observable } from 'rxjs';

export type TvState = 'on' | 'off';

@Injectable({ providedIn: 'root' })
export class TvService {
    private readonly http = inject(HttpClient);

    // What the TV last said over HDMI-CEC, written by pi/hdmicec.sh: "on" while it shows the Pi,
    // "off" when it's off or on another input. Read at startup, because the TV may have said it
    // before the browser was there to hear the key press. Nothing when the TV hasn't said anything
    // since the Pi started.
    public getState(): Observable<TvState> {
        return this.http.get('/live/tv', { responseType: 'text', params: { t: Date.now() } }).pipe(
            map((state) => (state.trim() === 'off' ? 'off' : 'on')),
            catchError(() => EMPTY),
        );
    }

    // Turns the TV on and switches it to the Pi, see pi/control-tv-on
    public turnOn(): Observable<string> {
        return this.http.post('/control/tv-on', null, { responseType: 'text' });
    }
}
