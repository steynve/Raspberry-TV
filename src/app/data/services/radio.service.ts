import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, map, Observable } from 'rxjs';
import { NowPlaying, RadioChannel } from '@data/models/radio-channel.model';

// The stations' "now playing" APIs, as far as the app reads them
interface KinkResponse {
    extended: Record<string, { title: string; artist: string }>; // by station
}

interface FluxResponse {
    trackInfo: { title: string; artistCredits: string };
}

interface DnbResponse {
    title: string;
    artist: string;
}

@Injectable({ providedIn: 'root' })
export class RadioService {
    private readonly http = inject(HttpClient);

    public readonly radioChannels: RadioChannel[] = [
        {
            file: 'http://playerservices.streamtheworld.com/api/livestream-redirect/KINK.mp3',
            visibleName: '<i>K</i>INK',
            apiSrc: 'KINK',
            apiRef: 'kink',
        },
        {
            file: 'http://playerservices.streamtheworld.com/api/livestream-redirect/KINK_DNA.mp3',
            visibleName: '<i>K</i>INK Classics',
            apiSrc: 'KINK',
            apiRef: 'kink-dna',
        },
        {
            file: 'http://playerservices.streamtheworld.com/api/livestream-redirect/KINK_DISTORTION.mp3',
            visibleName: '<i>K</i>INK Distortion',
            apiSrc: 'KINK',
            apiRef: 'kink-distortion',
        },
        {
            file: 'http://playerservices.streamtheworld.com/api/livestream-redirect/KINK_90S.mp3',
            visibleName: "<i>K</i>INK 90's",
            apiSrc: 'KINK',
            apiRef: 'kink-nineties',
        },
        {
            file: 'https://fluxmusic.api.radiosphere.io/channels/70s/stream.mp3',
            visibleName: '70s',
            apiSrc: 'FLUX',
            apiRef: '1f213c96-045b-4cd0-98c5-8717a16ddbae',
        },
        {
            file: 'https://fluxmusic.api.radiosphere.io/channels/alternative/stream.mp3',
            visibleName: 'Alt',
            apiSrc: 'FLUX',
            apiRef: '4885aa15-eecb-49ed-9958-106ce4c95191',
        },
        {
            file: 'https://dnbradio.nl/dnbradio_main.mp3',
            visibleName: "Drum 'n Bass",
            apiSrc: 'DNB',
            apiRef: '',
        },
        {
            file: 'https://fluxmusic.api.radiosphere.io/channels/b-funk/stream.mp3',
            visibleName: 'Funk',
            apiSrc: 'FLUX',
            apiRef: '85f323a6-e066-49ab-9a3d-fb74030adfae',
        },
        {
            file: 'https://fluxmusic.api.radiosphere.io/channels/boom-fm-classics/stream.mp3',
            visibleName: 'HipHop',
            apiSrc: 'FLUX',
            apiRef: '15b5625a-fdbc-4d08-8b7c-9c9b331e1977',
        },
        {
            file: 'https://fluxmusic.api.radiosphere.io/channels/indiedisco/stream.mp3',
            visibleName: 'Indie',
            apiSrc: 'FLUX',
            apiRef: 'cbc089f5-b834-40ca-9438-0b2f4bfb915f',
        },
        {
            file: 'https://fluxmusic.api.radiosphere.io/channels/chillhop/stream.mp3',
            visibleName: 'LoFi',
            apiSrc: 'FLUX',
            apiRef: 'e3d6cb48-55bb-41c5-ab72-9def83aa3ca8',
        },
        {
            file: 'https://fluxmusic.api.radiosphere.io/channels/metal-fm/stream.mp3',
            visibleName: 'Metal',
            apiSrc: 'FLUX',
            apiRef: 'c07531b0-a882-42f2-ae6d-645435c634db',
        },
        {
            file: 'http://streams.fluxfm.de/dubradio/mp3-128/streams.fluxfm.de/',
            visibleName: 'Reggae',
            apiSrc: 'NONE',
            apiRef: '',
        },
        // Played from the Spotify app through Spotify Connect on the Pi, not as a stream here
        { file: '', visibleName: 'Spotify', apiSrc: 'SPOTIFY', apiRef: '' },
    ];

    // Nothing for a station without an API, or Spotify, which the Pi reports itself
    public getNowPlaying({ apiSrc, apiRef }: RadioChannel): Observable<NowPlaying> {
        switch (apiSrc) {
            case 'KINK':
                return this.http
                    .get<KinkResponse>('https://api.kink.nl/static/now-playing.json')
                    .pipe(
                        map(({ extended }) => ({
                            song: extended[apiRef]?.title ?? '',
                            artist: extended[apiRef]?.artist ?? '',
                        })),
                    );
            case 'FLUX':
                return this.http
                    .get<FluxResponse>(
                        `https://fluxmusic.api.radiosphere.io/channels/${apiRef}/current-track`,
                    )
                    .pipe(
                        map(({ trackInfo }) => ({
                            song: trackInfo.title,
                            artist: trackInfo.artistCredits,
                        })),
                    );
            case 'DNB':
                return this.http
                    .get<DnbResponse>('https://api.dnbradio.nl/now_playing')
                    .pipe(map(({ title, artist }) => ({ song: title, artist })));
            default:
                return EMPTY;
        }
    }
}
