import { formatTime } from '@data/utils/time';
import { Component, computed, input } from '@angular/core';
import { RainSlot, rainSummary } from '@data/utils/rain';
import { IconComponent } from '@shared/components/icon/icon.component';

const CHART_HEIGHT = 30; // matches the SVG viewBox

// A smooth line through the points, via quadratic curves between the midpoints.
// The curve stays within the points' bounds, so it never dips below "no rain".
export const smoothLine = (points: [number, number][]): string => {
    if (points.length < 2) return '';

    const [first, ...rest] = points;
    const last = points[points.length - 1];
    const path = [`M ${first[0]} ${first[1]}`];

    rest.slice(0, -1).forEach(([x, y], index) => {
        const [nextX, nextY] = rest[index + 1];
        path.push(`Q ${x} ${y} ${(x + nextX) / 2} ${(y + nextY) / 2}`);
    });

    path.push(`L ${last[0]} ${last[1]}`);

    return path.join(' ');
};

@Component({
    selector: 'app-tv-rain',
    templateUrl: './tv-rain.component.html',
    styleUrl: './tv-rain.component.scss',
    imports: [IconComponent],
})
export class TvRainComponent {
    public readonly slots = input.required<RainSlot[]>();

    public readonly summary = computed(() => rainSummary(this.slots()));

    public readonly axis = computed(() => {
        const slots = this.slots();

        return ['Now', slots[4], slots[8]].map((slot) =>
            typeof slot === 'string' ? slot : slot ? formatTime(slot.time) : '',
        );
    });

    public readonly linePath = computed(() => {
        const slots = this.slots();
        // Scale to at least 0.75 mm per 15 minutes (heavy rain), so drizzle stays small
        const max = Math.max(0.75, ...slots.map((slot) => slot.precipitation));

        return smoothLine(
            slots.map((slot, index) => [
                (index / (slots.length - 1)) * 100,
                CHART_HEIGHT - Math.min(slot.precipitation / max, 1) * (CHART_HEIGHT - 2),
            ]),
        );
    });

    public readonly areaPath = computed(() => {
        const line = this.linePath();

        return line ? `${line} L 100 ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z` : '';
    });
}
