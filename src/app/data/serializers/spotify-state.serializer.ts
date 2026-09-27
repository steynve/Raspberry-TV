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
        );
    }

    public toJson(state: SpotifyState): object {
        return { ...state };
    }
}
