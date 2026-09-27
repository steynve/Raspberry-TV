import { PowerStore } from './power.store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { inject, Injectable, signal } from '@angular/core';
import { SpotifyState } from '@data/models/spotify-state.model';
import { SpotifyService } from '@data/services/spotify.service';
import {
    catchError,
    distinctUntilChanged,
    EMPTY,
    filter,
    merge,
    Observable,
    skip,
    Subject,
    switchMap,
} from 'rxjs';

// What Spotify Connect on the Pi is playing. The Pi taps F15 on every change (see
// pi/spotify-event.py) and the TV component calls refresh(). While the TV is on, a light check
// every 15 seconds also corrects anything that slipped through, like a dropped connection.
const CHECK_EVERY = 1000 * 15;

const sameState = (a: SpotifyState | undefined, b: SpotifyState | undefined): boolean =>
    JSON.stringify(a) === JSON.stringify(b);

@Injectable({ providedIn: 'root' })
export class SpotifyStore {
    private readonly spotifyService = inject(SpotifyService);
    private readonly power = inject(PowerStore);

    private readonly refreshes = new Subject<void>();

    // Only a real change updates the screen, not every check
    public readonly state = signal<SpotifyState | undefined>(undefined, { equal: sameState });

    constructor() {
        merge(
            // Now, whenever the TV comes back, and every 15 seconds while it's on
            this.power.poll(CHECK_EVERY),
            this.refreshes,
        )
            .pipe(
                // A track change brings several refreshes at once: only the newest answer counts,
                // so a slow earlier one can't put the previous song back
                switchMap(() => this.fetch()),
                takeUntilDestroyed(),
            )
            .subscribe((state) => this.state.set(state));

        // Nobody hears Spotify while the TV is off or on another input, just like the radio
        this.power.awake$
            .pipe(
                distinctUntilChanged(),
                skip(1),
                filter((awake) => !awake && !!this.state()?.playing),
                takeUntilDestroyed(),
            )
            .subscribe(() => this.pause());
    }

    public refresh(): void {
        this.refreshes.next();
    }

    public pause(): void {
        this.spotifyService
            .pause()
            .pipe(catchError(() => EMPTY))
            .subscribe();
    }

    // No file yet means Spotify hasn't been used since the Pi started
    private fetch(): Observable<SpotifyState> {
        return this.spotifyService.getState().pipe(catchError(() => EMPTY));
    }
}
