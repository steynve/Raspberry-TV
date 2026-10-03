// What a collector picks up, by the kind Ximmio names it
export type WasteType = 'GREY' | 'GREEN' | 'PAPER' | 'PLASTIC';

export interface WastePickup {
    type: WasteType;
    date: string; // local, "2026-10-16"
}
