import { AbstractModel } from './abstract.model';

export class OpenMeteoForecastDaily extends AbstractModel {
    public sunriseToday: string;
    public sunsetToday: string;
    public sunriseTomorrow: string;

    public sunriseTodayTimestamp: number;
    public sunsetTodayTimestamp: number;
    public sunriseTomorrowTimestamp: number;

    constructor(
        public time: string[],
        public sunrise: string[],
        public sunset: string[],
        public weather_code: number[],
        public temperature_2m_max: number[],
        public temperature_2m_min: number[],
        public precipitation_probability_max: number[],
        public uv_index_max: number[],
    ) {
        super();

        this.sunriseToday = this.sunrise[0].split('T')[1];
        this.sunsetToday = this.sunset[0].split('T')[1];
        this.sunriseTomorrow = this.sunrise[1].split('T')[1];

        this.sunriseTodayTimestamp = new Date(this.sunrise[0]).getTime();
        this.sunsetTodayTimestamp = new Date(this.sunset[0]).getTime();
        this.sunriseTomorrowTimestamp = new Date(this.sunrise[1]).getTime();
    }
}
