import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SpotifyEvent, SpotifyService, SpotifyStatus } from './spotify.service';

// Stands in for the browser's WebSocket, so a test can play go-librespot
class FakeWebSocket {
    public static last: FakeWebSocket;
    public onopen: (() => void) | null = null;
    public onmessage: ((message: { data: string }) => void) | null = null;
    public onclose: (() => void) | null = null;
    public close = vi.fn();

    constructor(public url: string) {
        FakeWebSocket.last = this;
    }
}

describe('SpotifyService', () => {
    let service: SpotifyService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(SpotifyService);
        httpMock = TestBed.inject(HttpTestingController);
        vi.stubGlobal('WebSocket', FakeWebSocket);
    });

    afterEach(() => {
        httpMock.verify();
        vi.unstubAllGlobals();
    });

    it('should read the status from go-librespot on the Pi', () => {
        let result: SpotifyStatus | null | undefined;
        service.getStatus().subscribe((status) => (result = status));

        httpMock.expectOne('http://localhost:3678/status').flush(null, {
            status: 204,
            statusText: 'No Content',
        });

        expect(result).toBeNull();
    });

    it('should pass on every event, and complete when the connection closes', () => {
        const events: SpotifyEvent[] = [];
        let complete = false;
        service.events().subscribe({
            next: (event) => events.push(event),
            complete: () => (complete = true),
        });
        const socket = FakeWebSocket.last;

        socket.onopen?.();
        socket.onmessage?.({ data: '{"type":"playing","data":{"uri":"spotify:track:1"}}' });
        socket.onclose?.();

        expect(socket.url).toBe('ws://localhost:3678/events');
        expect(events.map((event) => event.type)).toEqual(['open', 'playing']);
        expect(complete).toBe(true);
    });

    it('should close the connection when nobody listens anymore', () => {
        service.events().subscribe().unsubscribe();

        expect(FakeWebSocket.last.close).toHaveBeenCalled();
    });

    it('should list the playlists, without the ones Spotify no longer serves', () => {
        let names: string[] = [];
        service.getPlaylists().subscribe((playlists) => (names = playlists.map((p) => p.name)));

        httpMock
            .expectOne((req) => req.url === 'http://localhost:3678/library/playlists')
            .flush({
                items: [
                    { uri: 'spotify:playlist:rock', name: 'Rock', length: 41 },
                    { uri: 'spotify:playlist:37i9dQZF1EYk', name: '', length: 0 },
                    { uri: 'spotify:playlist:empty', name: 'Empty', length: 0 },
                ],
            });

        expect(names).toEqual(['Rock']);
    });

    it('should set the volume of the connection', () => {
        service.setVolume(100).subscribe();

        const request = httpMock.expectOne('http://localhost:3678/player/volume');
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({ volume: 100 });
        request.flush(null);
    });

    it('should stop and end the session', () => {
        service.stop().subscribe();

        const request = httpMock.expectOne('http://localhost:3678/player/stop');
        expect(request.request.method).toBe('POST');
        request.flush(null);
    });
});
