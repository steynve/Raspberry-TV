import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PiHealth } from '@data/models/pi-health.model';

// Same origin as the app, so no CORS: lighttpd serves the Pi's live files under /live/
@Injectable({ providedIn: 'root' })
export class PiHealthService {
    private readonly http = inject(HttpClient);

    public getHealth(): Observable<PiHealth> {
        // The file changes every minute, so never let the browser serve it from its cache
        return this.http.get<PiHealth>('/live/health.json', { params: { t: Date.now() } });
    }
}
