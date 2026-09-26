import { interval } from 'rxjs';
import { Npm } from '@data/models/npm.model';
import { NpmService } from '@data/services/npm.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';

@Component({
    selector: 'app-tv-npmfeed',
    templateUrl: './tv-npmfeed.component.html',
    styleUrl: './tv-npmfeed.component.scss',
})
export class TvNpmfeedComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly npmService = inject(NpmService);

    public readonly packages = signal<Npm[]>([
        { name: '@foxreis/tizentube' },
        { name: '@angular/core' },
    ]);

    public getFeed(): void {
        this.packages().forEach(({ name }) => {
            this.npmService
                .getDetails(name)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(({ distTags }) => {
                    this.packages.update((packages) =>
                        packages.map((pkg) => (pkg.name === name ? { ...pkg, distTags } : pkg)),
                    );
                });
        });
    }

    public ngOnInit(): void {
        this.getFeed();

        interval(1000 * 60 * 60 * 24) // 1 day
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.getFeed());
    }
}
