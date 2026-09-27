import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { PiHealth } from '@data/models/pi-health.model';
import { PiHealthSerializer } from '@data/serializers/pi-health.serializer';

// Same origin as the app, so no CORS: lighttpd serves the Pi's live files under /live/
@Injectable({
    providedIn: 'root',
})
export class PiHealthService extends HttpService<PiHealth> {
    constructor() {
        super();

        this.setBaseUrl('/');
        this.setResource('live/health.json');
        this.setSerializer(new PiHealthSerializer());
    }

    public getHealth(): Observable<PiHealth> {
        // The file changes every minute, so never let the browser serve it from its cache
        this.setParams({ t: Date.now() });
        return this.read();
    }
}
