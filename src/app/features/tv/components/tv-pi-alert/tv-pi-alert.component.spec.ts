import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PiHealthStore } from '@data/stores/pi-health.store';
import { TvPiAlertComponent } from './tv-pi-alert.component';

describe('TvPiAlertComponent', () => {
    it('should only show up when something is wrong', () => {
        const alerts = signal<string[]>([]);
        TestBed.configureTestingModule({
            providers: [{ provide: PiHealthStore, useValue: { alerts } }],
        });

        const fixture = TestBed.createComponent(TvPiAlertComponent);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.alert')).toBeNull();

        alerts.set(['78 °C', 'Under-voltage']);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.alert').textContent.trim()).toBe(
            'Pi · 78 °C · Under-voltage',
        );
    });
});
