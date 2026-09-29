import { AbstractModel } from './abstract.model';

// The last 48 hours and the next 24 hours. Sums and maximums are for the hour before their time
// (14:00 is the rain that fell from 13:00 to 14:00), cloud cover is at that moment.
export class OpenMeteoForecastHourly extends AbstractModel {
    constructor(
        public time: string[],
        public precipitation: number[],
        public et0_fao_evapotranspiration: number[],
        public cloud_cover: number[],
        public wind_gusts_10m: number[],
        public precipitation_probability: number[],
        // Low clouds (up to 3 km) block the sunset, mid and high ones catch its colour
        public cloud_cover_low: number[],
        public cloud_cover_mid: number[],
        public cloud_cover_high: number[],
    ) {
        super();
    }
}
