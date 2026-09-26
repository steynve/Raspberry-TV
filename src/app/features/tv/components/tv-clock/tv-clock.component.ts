import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';

@Component({
    selector: 'app-tv-clock',
    templateUrl: './tv-clock.component.html',
    styleUrl: './tv-clock.component.scss',
})
export class TvClockComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);

    public readonly date = signal('');
    public readonly time = signal('');

    public getDateTime(): void {
        const today = new Date();

        this.date.set(
            today.toLocaleString('nl-NL', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
            }),
        );

        this.time.set(
            today.toLocaleString('nl-NL', {
                hour: '2-digit',
                minute: '2-digit',
            }),
        );
    }

    public ngOnInit(): void {
        this.getDateTime();

        interval(1000) // 1 second
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.getDateTime());
    }
}
