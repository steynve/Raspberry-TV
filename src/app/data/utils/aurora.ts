import { KpBlock } from '@data/models/kp-forecast.model';

const BLOCK = 1000 * 60 * 60 * 3; // NOAA reports Kp per 3 hours

// The highest Kp in any block that overlaps the window
export const maxKp = (forecast: KpBlock[], start: Date, end: Date): number | undefined => {
    const values = forecast
        .filter(
            (block) =>
                block.start.getTime() < end.getTime() &&
                block.start.getTime() + BLOCK > start.getTime(),
        )
        .map((block) => block.kp);

    return values.length ? Math.max(...values) : undefined;
};

// From the Netherlands the northern lights show from around Kp 6, and clearly from Kp 8.
// During the day it's about the coming night, hence "tonight".
export const auroraChance = (kp: number | undefined, tonight = false): string | undefined => {
    if (kp === undefined || kp < 6) return undefined;

    const chance = kp >= 8 ? 'Good chance of northern lights' : 'Northern lights possible';

    return `${chance}${tonight ? ' tonight' : ''} · Kp ${Math.round(kp)}`;
};
