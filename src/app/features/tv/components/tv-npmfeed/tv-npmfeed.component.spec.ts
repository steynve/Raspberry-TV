import { of } from 'rxjs';
import { Npm } from '@data/models/npm.model';
import { NpmService } from '@data/services/npm.service';
import { TvNpmfeedComponent } from './tv-npmfeed.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('TvNpmfeedComponent', () => {
    let component: TvNpmfeedComponent;
    let fixture: ComponentFixture<TvNpmfeedComponent>;
    const getDetails = vi.fn((name: string) => of(new Npm(name, { latest: `${name}-1.0.0` })));

    beforeEach(() => {
        vi.useFakeTimers();
        getDetails.mockClear();

        TestBed.configureTestingModule({
            providers: [{ provide: NpmService, useValue: { getDetails } }],
        });

        fixture = TestBed.createComponent(TvNpmfeedComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => vi.useRealTimers());

    it('should fetch the latest version of every package on init', () => {
        expect(getDetails).toHaveBeenCalledTimes(component.packages().length);
        expect(component.packages().map((pkg) => pkg.distTags?.latest)).toEqual([
            '@foxreis/tizentube-1.0.0',
            '@angular/core-1.0.0',
        ]);
    });

    it('should render the packages', () => {
        fixture.detectChanges();

        const items = fixture.nativeElement.querySelectorAll('li');

        expect(items.length).toBe(2);
        expect(items[0].textContent).toContain('@foxreis/tizentube-1.0.0');
    });

    it('should refresh the feed every day', () => {
        vi.advanceTimersByTime(1000 * 60 * 60 * 24);

        expect(getDetails).toHaveBeenCalledTimes(component.packages().length * 2);
    });
});
