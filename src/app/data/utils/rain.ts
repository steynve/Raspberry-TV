import { formatTime } from './time';
import { OpenMeteoForecastMinutely15 } from '@data/models/openmeteo-forecast-minutely15.model';

export interface RainSlot {
    time: Date;
    precipitation: number; // mm per 15 minutes
}

const SLOT_COUNT = 9; // now until 2 hours from now, in steps of 15 minutes

export const isWet = (slot: RainSlot): boolean => slot.precipitation > 0;

export const upcomingRain = (
    minutely15: OpenMeteoForecastMinutely15,
    now = new Date(),
): RainSlot[] => {
    const slotStart = new Date(now);
    slotStart.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);

    return minutely15.time
        .map((time, index) => ({
            time: new Date(time),
            precipitation: minutely15.precipitation[index] ?? 0,
        }))
        .filter((slot) => slot.time >= slotStart)
        .slice(0, SLOT_COUNT);
};

export const rainSummary = (slots: RainSlot[]): string => {
    if (!slots.some(isWet)) {
        return 'Dry for the next 2 hours';
    }

    const peakPerHour = Math.max(...slots.map((slot) => slot.precipitation)) * 4;
    const intensity = peakPerHour < 2.5 ? 'Light rain' : peakPerHour < 10 ? 'Rain' : 'Heavy rain';

    if (isWet(slots[0])) {
        const dry = slots.find((slot) => !isWet(slot));

        return dry
            ? `${intensity} until ${formatTime(dry.time)}`
            : `${intensity} for the next 2 hours`;
    }

    return `${intensity} from ${formatTime(slots.find(isWet)!.time)}`;
};
