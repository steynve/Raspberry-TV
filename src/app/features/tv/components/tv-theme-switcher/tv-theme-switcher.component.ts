import { Component, inject, input } from '@angular/core';
import { THEMES, ThemeStore } from '@data/stores/theme.store';

// Shows the themes and their colour buttons for a moment, whenever one is pressed
@Component({
    selector: 'app-tv-theme-switcher',
    templateUrl: './tv-theme-switcher.component.html',
    styleUrl: './tv-theme-switcher.component.scss',
    host: {
        '[class.visible]': 'visible()',
        '[attr.aria-hidden]': '!visible()',
        role: 'status',
    },
})
export class TvThemeSwitcherComponent {
    public readonly theme = inject(ThemeStore).theme;
    public readonly themes = THEMES;
    public readonly visible = input(false);
}
