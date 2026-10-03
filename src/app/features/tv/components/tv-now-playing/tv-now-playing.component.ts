import { EMPTY, interval, startWith, switchMap } from 'rxjs';
import { PowerStore } from '@data/stores/power.store';
import { RadioStore } from '@data/stores/radio.store';
import { Component, computed, inject, signal } from '@angular/core';
import { positionNow, SpotifyStore } from '@data/stores/spotify.store';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/components/icon/icon.component';

// What plays: the station or Spotify, the song, the cover, and for Spotify how far the song is
@Component({
    selector: 'app-tv-now-playing',
    templateUrl: './tv-now-playing.component.html',
    styleUrl: './tv-now-playing.component.scss',
    imports: [IconComponent],
})
export class TvNowPlayingComponent {
    private readonly spotify = inject(SpotifyStore);
    private readonly power = inject(PowerStore);

    public readonly radio = inject(RadioStore);

    // Ticks once a second, only while a Spotify song plays and someone can see it
    private readonly now = signal(Date.now());
    private readonly ticking = computed(
        () => this.radio.isSpotify() && this.spotify.state().playing && this.power.awake(),
    );

    // From 0 to 1, undefined without a Spotify song
    public readonly progress = computed(() => {
        const state = this.spotify.state();

        if (!this.radio.isSpotify() || !state.active || !state.duration) return undefined;

        return positionNow(state, this.now()) / state.duration;
    });

    constructor() {
        toObservable(this.ticking)
            .pipe(
                switchMap((ticking) => (ticking ? interval(1000).pipe(startWith(0)) : EMPTY)),
                takeUntilDestroyed(),
            )
            .subscribe(() => this.now.set(Date.now()));
    }
}
