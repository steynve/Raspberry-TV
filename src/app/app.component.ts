import { Component } from '@angular/core';
import { TvComponent } from '@features/tv/tv.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    imports: [TvComponent],
})
export class AppComponent {}
