import { AbstractModel } from './abstract.model';

export interface KpBlock {
    start: Date; // a block covers 3 hours
    kp: number;
}

// NOAA's planetary K-index: observed for the past week, predicted for the next 3 days
export class KpForecast extends AbstractModel {
    constructor(public blocks: KpBlock[]) {
        super();
    }
}
