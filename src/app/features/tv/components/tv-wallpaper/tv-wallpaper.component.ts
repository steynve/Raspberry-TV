import { interval } from 'rxjs';
import { Photos } from '@data/models/photos.model';
import { PexelsService } from '@data/services/pexels.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';

@Component({
    selector: 'app-tv-wallpaper',
    templateUrl: './tv-wallpaper.component.html',
    styleUrl: './tv-wallpaper.component.scss',
})
export class TvWallpaperComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly pexelsService = inject(PexelsService);
    private readonly photoParameters = '?auto=compress&fit=crop&w=1920&h=1080';
    private readonly gradient =
        'linear-gradient(to bottom, rgba(81, 68, 33, 0.75), rgba(0, 0, 0, 0.75))';

    public readonly hidden = input(false);
    public readonly dayIndex = signal(0);
    public readonly photos = signal<Photos | undefined>(undefined);

    public readonly currentBackgroundImage = computed(() => {
        const photos = this.photos()?.photos;

        if (!photos?.length) {
            return this.gradient;
        }

        const photo = photos[this.dayIndex()].src.original;

        return `${this.gradient}, url('${photo}${this.photoParameters}')`;
    });

    public getPhotos(): void {
        const season = ['winter', 'spring', 'summer', 'autumn'][
            Math.floor((new Date().getMonth() / 12) * 4) % 4
        ];

        this.pexelsService
            .getPhotos(`${season} nature forest wallpaper`)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((result) => this.photos.set(result));
    }

    public setCurrentDay(): void {
        this.dayIndex.set(new Date().getDate());
    }

    public ngOnInit(): void {
        this.getPhotos();
        this.setCurrentDay();

        interval(1000 * 60 * 60 * 24 * 7) // 1 week
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.getPhotos());

        interval(1000 * 60 * 60 * 6) // 6 hours
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.setCurrentDay());
    }
}
