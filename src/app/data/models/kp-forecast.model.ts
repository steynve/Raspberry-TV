// NOAA's planetary K-index, per block of 3 hours: observed for the past week, predicted for the
// next 3 days
export interface KpBlock {
    start: Date;
    kp: number;
}
