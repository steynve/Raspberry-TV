import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Serializer } from '../serializers/serializer';
import { AbstractModel } from '../models/abstract.model';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';

type HttpParams = Record<
    string,
    string | number | boolean | readonly (string | number | boolean)[]
>;

@Injectable({
    providedIn: 'root',
})
export abstract class HttpService<T extends AbstractModel> {
    protected readonly http = inject(HttpClient);

    public headers: HttpHeaders | undefined;
    public params: HttpParams | undefined;

    public baseUrl!: string;
    public resource!: string;
    public serializer!: Serializer;

    public read(): Observable<T> {
        return this.http
            .get(`${this.baseUrl}${this.resource}`, {
                headers: this.headers,
                params: this.params,
            })
            .pipe(
                map((data: object) => this.serializer.fromJson(data) as T),
                catchError((error) => this.catchError(error)),
            );
    }

    public catchError(error: HttpErrorResponse): Observable<T> {
        return throwError(() => error);
    }

    public setBaseUrl(baseUrl: string): void {
        this.baseUrl = baseUrl;
    }

    public setResource(resource: string): void {
        this.resource = resource;
    }

    public setHeaders(headers: HttpHeaders): void {
        this.headers = headers;
    }

    public setParams(params: HttpParams): void {
        this.params = params;
    }

    public setSerializer(serializer: Serializer): void {
        this.serializer = serializer;
    }
}
