import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Npm } from '@data/models/npm.model';
import { NpmSerializer } from '@data/serializers/npm.serializer';

@Injectable({
    providedIn: 'root',
})
export class NpmService extends HttpService<Npm> {
    constructor() {
        super();

        this.setSerializer(new NpmSerializer());
        this.setBaseUrl('https://registry.npmjs.org/');
    }

    public getDetails(resource: string): Observable<Npm> {
        this.setResource(resource);
        return this.read();
    }
}
