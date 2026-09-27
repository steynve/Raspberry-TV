import { AbstractModel } from './abstract.model';

// Written by pi/spotify-event.py on every Spotify Connect event
export class SpotifyState extends AbstractModel {
    constructor(
        public time: number, // unix seconds
        public active: boolean, // a phone is connected and has something loaded
        public playing: boolean,
        public title: string,
        public artist: string,
        public album: string,
    ) {
        super();
    }
}
