const SYNODIC_MONTH = 29.530588853; // days from new moon to new moon
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

const NAMES = [
    'New moon',
    'Waxing crescent',
    'First quarter',
    'Waxing gibbous',
    'Full moon',
    'Waning gibbous',
    'Last quarter',
    'Waning crescent',
];

export interface MoonPhase {
    phase: number; // 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter
    illumination: number; // 0 to 1
    name: string;
}

export const moonPhase = (date: Date): MoonPhase => {
    const days = (date.getTime() - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
    const phase = (((days / SYNODIC_MONTH) % 1) + 1) % 1;

    return {
        phase,
        illumination: (1 - Math.cos(2 * Math.PI * phase)) / 2,
        name: NAMES[Math.round(phase * NAMES.length) % NAMES.length],
    };
};

// The lit part of a moon with radius 10 in a 24×24 box, as seen from the northern hemisphere.
// Half the outline on the lit side, closed by the terminator: an ellipse whose width follows the phase.
export const moonPath = (phase: number): string => {
    const waxing = phase < 0.5;
    const terminator = Math.abs(Math.cos(2 * Math.PI * phase)) * 10;
    const crescent = phase < 0.25 || phase > 0.75;
    const outline = waxing ? 1 : 0;
    const sweep = waxing === crescent ? 0 : 1;

    return `M 12 2 A 10 10 0 0 ${outline} 12 22 A ${terminator.toFixed(3)} 10 0 0 ${sweep} 12 2 Z`;
};
