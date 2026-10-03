import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PiHealth } from '@data/models/pi-health.model';
import { TvSystemComponent } from './tv-system.component';
import { PiHealthStore } from '@data/stores/pi-health.store';
import { piHealthMock } from '@data/services/mocks/pi-health.mock';

describe('TvSystemComponent', () => {
    const render = (health: PiHealth | undefined): HTMLElement => {
        TestBed.configureTestingModule({
            providers: [{ provide: PiHealthStore, useValue: { health: signal(health) } }],
        });

        const fixture = TestBed.createComponent(TvSystemComponent);
        fixture.detectChanges();

        return fixture.nativeElement;
    };

    const rows = (element: HTMLElement): Record<string, string> =>
        Object.fromEntries(
            Array.from(element.querySelectorAll('.row')).map((row) => [
                row.querySelector('dt')?.textContent,
                row.querySelector('dd')?.textContent,
            ]),
        );

    it('should list the measurements', () => {
        expect(rows(render(piHealthMock()))).toEqual({
            Temperature: '51.2 °C',
            Load: '0.42',
            Memory: '43% of 926 MB',
            Storage: '38%',
            'Up for': '12 days 0h',
        });
    });

    it('should highlight what needs attention', () => {
        const element = render(piHealthMock({ temperature: 81, disk: 93 }));
        const warnings = Array.from(element.querySelectorAll('.row.warning dt')).map(
            (dt) => dt.textContent,
        );

        expect(warnings).toEqual(['Temperature', 'Storage']);
    });

    it('should explain what to do without measurements', () => {
        expect(render(undefined).querySelector('.empty')?.textContent).toContain('pi/setup.sh');
    });
});
