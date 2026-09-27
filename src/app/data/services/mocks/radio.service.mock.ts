/* eslint-disable @typescript-eslint/no-unused-vars */
import { Observable, of } from 'rxjs';
import { DNB } from '../../models/dnb.model';
import { Kink } from '../../models/kink.model';
import { Flux } from '../../models/flux.model';
import { FluxArtist } from '../../models/flux-artists.model';
import { RadioChannel } from '../../models/radio-channel.model';
import { FluxTrackInfo } from '../../models/flux-track-info.model';

export class RadioServiceMock {
    public kinkResponse = new Kink(
        {
            kink: 'kink_song - kink_artist',
        },
        'kink_song - kink_artist',
        {
            kink: {
                artist: 'kink_artist',
                title: 'kink_song',
            },
        },
        false,
    );

    public fluxResponse = new Flux(
        new FluxTrackInfo('flux_song', 'flux_artistCredits', [new FluxArtist('flux_artist')]),
    );

    public dnbResponse = new DNB('dnb_song', 'dnb_artist');

    public radioChannels = [
        new RadioChannel('http://website.com/api/KINK.mp3', 'KINK', 'KINK', 'kink'),
        new RadioChannel(
            'http://website.com/api/flux.mp3',
            'FLUX',
            'FLUX',
            '4885aa15-eecb-49ed-9958-106ce4c95191',
        ),
        new RadioChannel('http://website.com/api/dnb.mp3', 'DNB', 'DNB', ''),
        new RadioChannel('http://website.com/api/none.mp3', 'NONE', 'NONE', ''),
        new RadioChannel('', 'Spotify', 'SPOTIFY', ''),
    ];

    public getNowPlaying(radioChannel: RadioChannel): Observable<Kink | Flux | DNB> {
        return this.getNowPlayingKink();
    }

    public getNowPlayingKink(): Observable<Kink | Flux | DNB> {
        return of(this.kinkResponse);
    }

    public getNowPlayingFlux(channel: string): Observable<Kink | Flux | DNB> {
        return of(this.fluxResponse);
    }

    public getNowPlayingDNB(): Observable<Kink | Flux | DNB> {
        return of(this.dnbResponse);
    }
}
