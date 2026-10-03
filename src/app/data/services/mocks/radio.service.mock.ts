import { Observable, of } from 'rxjs';
import { NowPlaying, RadioChannel } from '@data/models/radio-channel.model';

export class RadioServiceMock {
    public nowPlaying: NowPlaying = { song: 'kink_song', artist: 'kink_artist' };

    public radioChannels: RadioChannel[] = [
        {
            file: 'http://website.com/api/KINK.mp3',
            visibleName: 'KINK',
            apiSrc: 'KINK',
            apiRef: 'kink',
        },
        {
            file: 'http://website.com/api/flux.mp3',
            visibleName: 'FLUX',
            apiSrc: 'FLUX',
            apiRef: '4885aa15-eecb-49ed-9958-106ce4c95191',
        },
        { file: 'http://website.com/api/dnb.mp3', visibleName: 'DNB', apiSrc: 'DNB', apiRef: '' },
        {
            file: 'http://website.com/api/none.mp3',
            visibleName: 'NONE',
            apiSrc: 'NONE',
            apiRef: '',
        },
        { file: '', visibleName: 'Spotify', apiSrc: 'SPOTIFY', apiRef: '' },
    ];

    public getNowPlaying(): Observable<NowPlaying> {
        return of(this.nowPlaying);
    }
}
