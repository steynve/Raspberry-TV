import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Photos } from '@data/models/photos.model';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class PexelsService {
    private readonly http = inject(HttpClient);

    public getPhotos(query: string): Observable<Photos> {
        return this.http.get<Photos>('https://api.pexels.com/v1/search', {
            headers: { Authorization: environment.pexels_api_key },
            params: { query, orientation: 'landscape', per_page: 60, size: 'large' },
        });
    }
}
