import { AbstractModel } from './abstract.model';

// The last 48 hours and the next 24 hours
export class OpenMeteoForecastHourly extends AbstractModel {
    constructor(
        public time: string[],
        public precipitation: number[],
        public et0_fao_evapotranspiration: number[],
        public cloud_cover: number[],
        public wind_gusts_10m: number[],
    ) {
        super();
    }
}
