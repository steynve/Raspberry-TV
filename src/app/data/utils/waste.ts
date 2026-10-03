import { WastePickup } from '@data/models/waste.model';

// What to do with the bins: put them out tonight (for tomorrow or later), put them out now (the
// morning of a collection), or bring them back in after one
export type WasteAction = 'out-tonight' | 'out-now' | 'back-in';

export interface WasteReminder {
    action: WasteAction;
    pickups: WastePickup[]; // each kind once, by date
}

// Evening reminders start at noon, and the last call in the morning ends then: Area comes early,
// but a forgotten bin might still make it
const FROM_HOUR = 12;

export const WEEKDAYS = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
];

const day = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// From a day, a number of days on (or back), skipping evenings someone might not be home (by
// getDay()), at most a week
const nextHomeEvening = (date: string, step: 1 | -1, awayEvenings: number[]): string => {
    const [year, month, dayOfMonth] = date.split('-').map(Number);
    const evening = new Date(year, month - 1, dayOfMonth);

    for (let days = 0; days < 7; days++) {
        if (!awayEvenings.includes(evening.getDay())) break;
        evening.setDate(evening.getDate() + step);
    }

    return day(evening);
};

const dayBefore = (date: string): string => {
    const [year, month, dayOfMonth] = date.split('-').map(Number);
    return day(new Date(year, month - 1, dayOfMonth - 1));
};

// The first evening to put a bin out: the one before the collection, or, when someone might not be
// home that evening (awayEvenings), the last evening before it someone surely is. The reminder runs
// from then until the evening before, so it's also there on an away evening someone is home after all.
export const firstPutOutDay = (pickup: WastePickup, awayEvenings: number[]): string =>
    nextHomeEvening(dayBefore(pickup.date), -1, awayEvenings);

// The last evening to bring a bin back in: the collection day, or, when someone might not be home
// that evening, the first evening after it someone surely is
export const lastBackInDay = (pickup: WastePickup, awayEvenings: number[]): string =>
    nextHomeEvening(pickup.date, 1, awayEvenings);

// Each kind once, the soonest collection first
const byDate = (pickups: WastePickup[]): WastePickup[] =>
    [...pickups]
        .sort((a, b) => a.date.localeCompare(b.date))
        .filter(
            (pickup, index, all) => all.findIndex((other) => other.type === pickup.type) === index,
        );

// Dates as "2026-10-05" compare like the days they are
export const wasteReminders = (
    pickups: WastePickup[],
    now: Date,
    awayEvenings: number[] = [],
): WasteReminder[] => {
    const today = day(now);
    const reminders: WasteReminder[] =
        now.getHours() < FROM_HOUR
            ? [{ action: 'out-now', pickups: pickups.filter((pickup) => pickup.date === today) }]
            : [
                  {
                      action: 'out-tonight',
                      pickups: pickups.filter(
                          (pickup) =>
                              firstPutOutDay(pickup, awayEvenings) <= today && today < pickup.date,
                      ),
                  },
                  {
                      action: 'back-in',
                      pickups: pickups.filter(
                          (pickup) =>
                              pickup.date <= today && today <= lastBackInDay(pickup, awayEvenings),
                      ),
                  },
              ];

    return reminders
        .map((reminder) => ({ ...reminder, pickups: byDate(reminder.pickups) }))
        .filter((reminder) => reminder.pickups.length);
};

// "monday" → 1, for the environment's waste_away_evenings
export const weekdayNumbers = (names: string[]): number[] =>
    names.map((name) => WEEKDAYS.indexOf(name.trim().toLowerCase())).filter((index) => index >= 0);
