import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { ColourKey, GREEN, RED } from '@data/models/keyboard-event-key.type';

export type Theme = 'glass' | 'code';

export interface ThemeOption {
    theme: Theme;
    name: string;
    key: ColourKey; // the colour button that picks it
}

// In the order of the colour buttons on the remote
export const THEMES: ThemeOption[] = [
    { theme: 'glass', name: 'Glass', key: RED },
    { theme: 'code', name: 'Code', key: GREEN },
];

const STORAGE_KEY = 'theme';

// The look of the whole app, as data-theme on <html>: see src/styles/themes/. Remembered in the
// browser, which the kiosk keeps until Chromium restarts.
@Injectable({ providedIn: 'root' })
export class ThemeStore {
    private readonly document = inject(DOCUMENT);

    public readonly theme = signal<Theme>(this.remembered());

    constructor() {
        effect(() => {
            const theme = this.theme();

            this.document.documentElement.dataset['theme'] = theme;

            try {
                localStorage.setItem(STORAGE_KEY, theme);
            } catch {
                // Not remembered, then: it still applies until the page reloads
            }
        });
    }

    // The theme for a colour button, if it picks one
    public themeFor(key: string): Theme | undefined {
        return THEMES.find((option) => option.key === key)?.theme;
    }

    private remembered(): Theme {
        try {
            const theme = localStorage.getItem(STORAGE_KEY);

            return THEMES.some((option) => option.theme === theme) ? (theme as Theme) : 'glass';
        } catch {
            return 'glass';
        }
    }
}
