import { PexelsService } from '@data/services/pexels.service';
import { TvWallpaperComponent } from './tv-wallpaper.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PexelsServiceMock } from '@data/services/mocks/pexels.service.mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('TvWallpaperComponent', () => {
    let component: TvWallpaperComponent;
    let fixture: ComponentFixture<TvWallpaperComponent>;
    let pexelsService: PexelsService;

    const gradient = 'linear-gradient(to bottom, rgba(81, 68, 33, 0.75), rgba(0, 0, 0, 0.75))';

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 6, 15));

        TestBed.configureTestingModule({
            providers: [{ provide: PexelsService, useClass: PexelsServiceMock }],
        });

        pexelsService = TestBed.inject(PexelsService);
        vi.spyOn(pexelsService, 'getPhotos');

        fixture = TestBed.createComponent(TvWallpaperComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => vi.useRealTimers());

    it('should fetch seasonal photos on init', () => {
        expect(pexelsService.getPhotos).toHaveBeenCalledWith('summer nature forest wallpaper');
    });

    it('should use the day of the month as photo index', () => {
        expect(component.dayIndex()).toBe(15);
    });

    describe('currentBackgroundImage', () => {
        it("should return today's photo with a gradient overlay", () => {
            expect(component.currentBackgroundImage()).toEqual(
                `${gradient}, url('original.jpg?auto=compress&fit=crop&w=1920&h=1080')`,
            );
        });

        it('should only return the gradient when there are no photos', () => {
            component.photos.set(undefined);

            expect(component.currentBackgroundImage()).toEqual(gradient);
        });
    });

    it('should refresh the photos every week', () => {
        vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 7);

        expect(pexelsService.getPhotos).toHaveBeenCalledTimes(2);
    });

    it('should update the day index every 6 hours', () => {
        vi.setSystemTime(new Date(2026, 6, 16));
        vi.advanceTimersByTime(1000 * 60 * 60 * 6);

        expect(component.dayIndex()).toBe(16);
    });

    it('should render the hidden class', () => {
        fixture.componentRef.setInput('hidden', true);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.tv-wallpaper').classList).toContain('hidden');
    });
});
