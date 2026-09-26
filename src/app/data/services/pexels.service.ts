import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Photos } from '../models/photos.model';
import { HttpHeaders } from '@angular/common/http';
import { environment } from '@environments/environment';
import { PhotosSerializer } from '../serializers/photos.serializer';

@Injectable({
    providedIn: 'root',
})
export class PexelsService extends HttpService<Photos> {
    constructor() {
        super();

        const headers = {
            Authorization: environment.pexels_api_key,
        };

        this.setHeaders(new HttpHeaders(headers));
        this.setSerializer(new PhotosSerializer());
        this.setBaseUrl('https://api.pexels.com/v1');
    }

    public getPhotos(query: string): Observable<Photos> {
        this.setResource('/search');

        const httpParams = {
            query,
            orientation: 'landscape',
            per_page: 60,
            size: 'large',
        };

        this.setParams(httpParams);

        return this.read();
    }
}
