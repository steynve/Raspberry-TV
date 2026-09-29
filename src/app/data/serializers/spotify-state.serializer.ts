import { SpotifyState } from '@data/models/spotify-state.model';

export class SpotifyStateSerializer {
    public fromJson(json: SpotifyState): SpotifyState {
        return new SpotifyState(
            json.time,
            json.active,
            json.playing,
            json.title,
            json.artist,
            json.album,
            json.cover ?? '', // Files from before covers were added don't have one
        );
    }

    public toJson(state: SpotifyState): object {
        return { ...state };
    }
}
