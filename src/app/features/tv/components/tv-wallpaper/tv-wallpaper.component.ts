import { Photos } from '@data/models/photos.model';
import { PexelsService } from '@data/services/pexels.service';
import { WeatherStore } from '@data/stores/weather.store';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { season, WallpaperMood, wallpaperMood, wallpaperQuery } from '@data/utils/wallpaper';
import {
    catchError,
    concat,
    debounceTime,
    distinctUntilChanged,
    EMPTY,
    filter,
    interval,
    map,
    Observable,
    of,
    race,
    startWith,
    switchMap,
    take,
    tap,
    timer,
} from 'rxjs';

const WEEK = 1000 * 60 * 60 * 24 * 7;
const STABLE_FOR = 1000 * 60 * 15; // the weather has to settle before the photo changes
const WEATHER_TIMEOUT = 1000 * 10; // start with the default photos if the weather doesn't load

@Component({
    selector: 'app-tv-wallpaper',
    templateUrl: './tv-wallpaper.component.html',
    styleUrl: './tv-wallpaper.component.scss',
})
export class TvWallpaperComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly pexelsService = inject(PexelsService);
    private readonly weatherStore = inject(WeatherStore);
    private readonly photoParameters = '?auto=compress&fit=crop&w=1920&h=1080';
    // A tiny copy, stretched over the glass widgets: the upscaling blurs it for free
    private readonly blurredParameters = '?auto=compress&fit=crop&w=48&h=27';
    private readonly cache = new Map<string, { photos: Photos; fetchedAt: number }>();

    public readonly idle = input(false);
    public readonly dayIndex = signal(0);
    public readonly photos = signal<Photos | undefined>(undefined);

    public readonly mood = computed<WallpaperMood | undefined>(() => {
        const forecast = this.weatherStore.forecast();
        const sun = this.weatherStore.sun();

        return forecast && sun ? wallpaperMood(forecast, sun) : undefined;
    });

    public readonly currentPhoto = computed(() => {
        const photos = this.photos()?.photos;

        return photos?.length ? photos[this.dayIndex() % photos.length] : undefined;
    });

    public readonly currentBackgroundImage = computed(() => {
        const photo = this.currentPhoto();

        return photo ? `url('${photo.src.original}${this.photoParameters}')` : null;
    });

    public readonly blurredBackgroundImage = computed(() => {
        const photo = this.currentPhoto();

        return photo ? `url('${photo.src.original}${this.blurredParameters}')` : null;
    });

    public readonly night = computed(() => this.weatherStore.sun()?.phase === 'night');

    constructor() {
        const mood$ = toObservable(this.mood).pipe(
            filter((mood): mood is WallpaperMood => mood !== undefined),
        );

        // The first mood right away, later changes only once they've lasted a while
        concat(
            race(mood$.pipe(take(1)), timer(WEATHER_TIMEOUT).pipe(map(() => 'default' as const))),
            mood$.pipe(debounceTime(STABLE_FOR)),
        )
            .pipe(
                distinctUntilChanged(),
                // Refresh the photos of the current mood once a week
                switchMap((mood) =>
                    interval(WEEK).pipe(
                        startWith(0),
                        switchMap(() => this.photosFor(wallpaperQuery(mood, season(new Date())))),
                    ),
                ),
                takeUntilDestroyed(),
            )
            .subscribe((photos) => this.photos.set(photos));
    }

    public setCurrentDay(): void {
        this.dayIndex.set(new Date().getDate());
    }

    public ngOnInit(): void {
        this.setCurrentDay();

        interval(1000 * 60 * 60 * 6) // 6 hours
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.setCurrentDay());
    }

    // Moods come back often (every night, every shower), so their photos are kept for a week
    private photosFor(query: string): Observable<Photos> {
        const cached = this.cache.get(query);

        if (cached && Date.now() - cached.fetchedAt < WEEK) {
            return of(cached.photos);
        }

        return this.pexelsService.getPhotos(query).pipe(
            tap((photos) => this.cache.set(query, { photos, fetchedAt: Date.now() })),
            catchError(() => EMPTY),
        );
    }
}
