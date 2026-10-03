import { describe, expect, it } from 'vitest';
import { WastePickup } from '@data/models/waste.model';
import { firstPutOutDay, lastBackInDay, wasteReminders, weekdayNumbers } from './waste';

describe('waste', () => {
    // An October in Hoogeveen: grey on Monday the 5th, plastic on Tuesday the 6th, green on Tuesday the 13th
    const pickups: WastePickup[] = [
        { type: 'GREY', date: '2026-10-05' },
        { type: 'PLASTIC', date: '2026-10-06' },
        { type: 'GREEN', date: '2026-10-13' },
    ];
    const grey = pickups[0];
    const plastic = pickups[1];
    const MONDAY = [1];

    const at = (dayOfMonth: number, hour: number): Date => new Date(2026, 9, dayOfMonth, hour);

    describe('firstPutOutDay()', () => {
        it('should be the evening before', () => {
            expect(firstPutOutDay({ type: 'GREEN', date: '2026-10-13' }, [])).toBe('2026-10-12');
        });

        it('should move back past evenings someone might not be home', () => {
            expect(firstPutOutDay({ type: 'GREEN', date: '2026-10-13' }, MONDAY)).toBe(
                '2026-10-11',
            );
            expect(firstPutOutDay({ type: 'GREEN', date: '2026-10-13' }, [0, 1])).toBe(
                '2026-10-10',
            );
        });

        it('should give up after a week when every evening is away', () => {
            expect(firstPutOutDay(plastic, [0, 1, 2, 3, 4, 5, 6])).toBe('2026-09-28');
        });
    });

    describe('lastBackInDay()', () => {
        it('should be the collection day', () => {
            expect(lastBackInDay(plastic, MONDAY)).toBe('2026-10-06');
        });

        it('should move on past evenings someone might not be home', () => {
            expect(lastBackInDay(grey, MONDAY)).toBe('2026-10-06');
        });
    });

    describe('wasteReminders()', () => {
        it('should have both out on Sunday, when maybe away on Monday evening', () => {
            expect(wasteReminders(pickups, at(4, 18), MONDAY)).toEqual([
                { action: 'out-tonight', pickups: [grey, plastic] },
            ]);
        });

        it('should still have the plastic out on Monday, and the grey bin back in', () => {
            expect(wasteReminders(pickups, at(5, 18), MONDAY)).toEqual([
                { action: 'out-tonight', pickups: [plastic] },
                { action: 'back-in', pickups: [grey] },
            ]);
        });

        it('should have both back in on Tuesday evening', () => {
            expect(wasteReminders(pickups, at(6, 18), MONDAY)).toEqual([
                { action: 'back-in', pickups: [grey, plastic] },
            ]);
            expect(wasteReminders(pickups, at(7, 18), MONDAY)).toEqual([]);
        });

        it('should remind the evening before, from noon, without away evenings', () => {
            expect(wasteReminders(pickups, at(4, 11))).toEqual([]);
            expect(wasteReminders(pickups, at(4, 12))).toEqual([
                { action: 'out-tonight', pickups: [grey] },
            ]);
        });

        it('should give a last call on the morning itself, until noon', () => {
            expect(wasteReminders(pickups, at(6, 7), MONDAY)).toEqual([
                { action: 'out-now', pickups: [plastic] },
            ]);
            expect(wasteReminders(pickups, at(6, 12), MONDAY)[0].action).toBe('back-in');
        });

        it('should name every kind once', () => {
            const twice: WastePickup[] = [...pickups, { type: 'GREY', date: '2026-10-05' }];

            expect(wasteReminders(twice, at(4, 20))[0].pickups).toHaveLength(1);
        });

        it('should work across a month', () => {
            // Sunday 1 November goes out on Saturday 31 October
            const november: WastePickup[] = [{ type: 'GREY', date: '2026-11-01' }];

            expect(wasteReminders(november, at(31, 20), MONDAY)).toEqual([
                { action: 'out-tonight', pickups: november },
            ]);
        });
    });

    it('should read weekday names', () => {
        expect(weekdayNumbers(['Monday', ' sunday ', 'someday'])).toEqual([1, 0]);
    });
});
