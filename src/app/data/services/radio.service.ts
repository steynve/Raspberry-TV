import { Observable } from 'rxjs';
import { DNB } from '../models/dnb.model';
import { Injectable } from '@angular/core';
import { Kink } from '../models/kink.model';
import { Flux } from '../models/flux.model';
import { HttpService } from './http.service';
import { RadioChannel } from '../models/radio-channel.model';
import { DNBSerializer } from '../serializers/dnb.serializer';
import { KinkSerializer } from '../serializers/kink.serializer';
import { FluxSerializer } from '../serializers/flux.serializer';

@Injectable({
    providedIn: 'root',
})
export class RadioService extends HttpService<Kink | Flux | DNB> {
    public radioChannels = [
        new RadioChannel(
            'http://playerservices.streamtheworld.com/api/livestream-redirect/KINK.mp3',
            '<i>K</i>INK',
            'KINK',
            'kink',
        ),
        new RadioChannel(
            'http://playerservices.streamtheworld.com/api/livestream-redirect/KINK_DNA.mp3',
            '<i>K</i>INK Classics',
            'KINK',
            'kink-dna',
        ),
        new RadioChannel(
            'http://playerservices.streamtheworld.com/api/livestream-redirect/KINK_DISTORTION.mp3',
            '<i>K</i>INK Distortion',
            'KINK',
            'kink-distortion',
        ),
        new RadioChannel(
            'https://fluxmusic.api.radiosphere.io/channels/alternative/stream.mp3',
            'Alt',
            'FLUX',
            '4885aa15-eecb-49ed-9958-106ce4c95191',
        ),
        new RadioChannel('https://dnbradio.nl/dnbradio_main.mp3', "Drum 'n Bass", 'DNB', ''),
        new RadioChannel(
            'https://fluxmusic.api.radiosphere.io/channels/b-funk/stream.mp3',
            'Funk',
            'FLUX',
            '85f323a6-e066-49ab-9a3d-fb74030adfae',
        ),
        new RadioChannel(
            'https://fluxmusic.api.radiosphere.io/channels/boom-fm-classics/stream.mp3',
            'HipHop',
            'FLUX',
            '15b5625a-fdbc-4d08-8b7c-9c9b331e1977',
        ),
        new RadioChannel(
            'https://fluxmusic.api.radiosphere.io/channels/indiedisco/stream.mp3',
            'Indie',
            'FLUX',
            'cbc089f5-b834-40ca-9438-0b2f4bfb915f',
        ),
        new RadioChannel(
            'https://fluxmusic.api.radiosphere.io/channels/chillhop/stream.mp3',
            'LoFi',
            'FLUX',
            'e3d6cb48-55bb-41c5-ab72-9def83aa3ca8',
        ),
        new RadioChannel(
            'https://fluxmusic.api.radiosphere.io/channels/metal-fm/stream.mp3',
            'Metal',
            'FLUX',
            'c07531b0-a882-42f2-ae6d-645435c634db',
        ),
        new RadioChannel(
            'http://streams.fluxfm.de/dubradio/mp3-128/streams.fluxfm.de/',
            'Reggae',
            'NONE',
            '',
        ),
    ];

    public getNowPlaying(radioChannel: RadioChannel): Observable<Kink | Flux | DNB> {
        if (radioChannel.apiSrc === 'KINK') {
            return this.getNowPlayingKink();
        }
        if (radioChannel.apiSrc === 'FLUX') {
            return this.getNowPlayingFlux(radioChannel.apiRef);
        }

        if (radioChannel.apiSrc === 'DNB') {
            return this.getNowPlayingDNB();
        }

        return new Observable();
    }

    public getNowPlayingKink(): Observable<Kink | Flux | DNB> {
        this.setSerializer(new KinkSerializer());
        this.setBaseUrl('https://api.kink.nl/static');
        this.setResource('/now-playing.json');

        return this.read();
    }

    public getNowPlayingFlux(channel: string): Observable<Kink | Flux | DNB | DNB> {
        this.setSerializer(new FluxSerializer());
        this.setBaseUrl('https://fluxmusic.api.radiosphere.io/channels/');
        this.setResource(`${channel}/current-track`);

        return this.read();
    }

    public getNowPlayingDNB(): Observable<Kink | Flux | DNB> {
        this.setSerializer(new DNBSerializer());
        this.setBaseUrl('https://api.dnbradio.nl/now_playing');
        this.setResource('');

        return this.read();
    }
}
