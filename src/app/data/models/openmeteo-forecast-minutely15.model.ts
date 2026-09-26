import { AbstractModel } from './abstract.model';

export class OpenMeteoForecastMinutely15 extends AbstractModel {
    constructor(
        public time: string[],
        public precipitation: number[],
    ) {
        super();
    }
}
