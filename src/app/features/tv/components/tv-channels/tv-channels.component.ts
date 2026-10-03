import { RadioStore } from '@data/stores/radio.store';
import { SpotifyStore } from '@data/stores/spotify.store';
import { KeyboardEventKey } from '@data/models/keyboard-event-key.type';
import { IconComponent } from '@shared/components/icon/icon.component';
import { TvSystemComponent } from '../tv-system/tv-system.component';
import {
    afterRenderEffect,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    output,
    signal,
    untracked,
} from '@angular/core';

type View = 'stations' | 'spotify';

interface SpotifyItem {
    uri: string;
    name: string;
    length?: number; // songs, unknown for Liked Songs
}

// The channel list, a sheet over the right edge: the stations, with Spotify as a folder of the
// account's playlists, what played recently, and the Pi's health. The remote moves the highlight
// (see TvComponent), OK plays, Back goes up a level or closes it.
@Component({
    selector: 'app-tv-channels',
    templateUrl: './tv-channels.component.html',
    styleUrl: './tv-channels.component.scss',
    imports: [IconComponent, TvSystemComponent],
})
export class TvChannelsComponent {
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

    public readonly radio = inject(RadioStore);
    public readonly spotify = inject(SpotifyStore);

    public readonly open = input(false);
    public readonly closed = output<void>();

    public readonly view = signal<View>('stations');
    public readonly selected = signal(0);

    public readonly spotifyItems = computed<SpotifyItem[]>(() => [
        { uri: this.spotify.likedSongs(), name: 'Liked Songs' },
        ...this.spotify.playlists(),
    ]);

    // Where the Spotify list starts: on what plays from it, if anything
    private readonly playingItem = computed(() =>
        Math.max(
            0,
            this.spotifyItems().findIndex((item) => item.uri === this.spotify.state().context),
        ),
    );

    private readonly length = computed(() =>
        this.view() === 'spotify' ? this.spotifyItems().length : this.radio.channels.length,
    );

    constructor() {
        // Every time it opens: on Spotify's list while Spotify is the channel, else on the stations,
        // with the highlight on what plays
        effect(() => {
            if (!this.open()) return;

            untracked(() =>
                this.radio.isSpotify()
                    ? this.openSpotify()
                    : this.show('stations', this.radio.channelIndex()),
            );
        });

        // The highlight stays in sight in a long list. Instantly, like the highlight itself.
        afterRenderEffect(() => {
            this.selected();
            this.view();
            this.element.nativeElement
                .querySelector('.channel.selected')
                ?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        });
    }

    public onKey(key: KeyboardEventKey): void {
        switch (key) {
            case 'ArrowUp':
                this.selected.update((index) => Math.max(0, index - 1));
                break;
            case 'ArrowDown':
                this.selected.update((index) => Math.min(this.length() - 1, index + 1));
                break;
            case 'Enter':
                this.choose();
                break;
            case 'Backspace':
                if (this.view() === 'spotify') {
                    this.show('stations', this.radio.spotifyIndex);
                } else {
                    this.closed.emit();
                }
                break;
        }
    }

    private choose(): void {
        const index = this.selected();

        if (this.view() === 'stations') {
            if (index === this.radio.spotifyIndex) {
                this.openSpotify();
                return;
            }

            this.radio.playChannel(index);
            this.closed.emit();
            return;
        }

        const item = this.spotifyItems()[index];

        if (this.spotify.signedIn() && item) {
            // Spotify takes over from the radio once it plays, see RadioStore
            this.spotify.play(item.uri);
            this.closed.emit();
        }
    }

    private openSpotify(): void {
        this.spotify.loadLibrary();
        this.show('spotify', this.playingItem());
    }

    private show(view: View, selected: number): void {
        this.view.set(view);
        this.selected.set(selected);
    }
}
