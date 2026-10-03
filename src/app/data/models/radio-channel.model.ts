export interface RadioChannel {
    file: string; // the stream
    visibleName: string; // HTML: KINK writes its K mirrored, see station.scss
    apiSrc: 'KINK' | 'FLUX' | 'DNB' | 'NONE' | 'SPOTIFY'; // where the song comes from
    apiRef: string; // the station at that API
}

// The song on a station right now
export interface NowPlaying {
    song: string;
    artist: string;
}
