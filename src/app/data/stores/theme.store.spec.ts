import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeStore } from './theme.store';

describe('ThemeStore', () => {
    afterEach(() => {
        localStorage.clear();
        delete document.documentElement.dataset['theme'];
    });

    it('should start with the glass theme', () => {
        const store = TestBed.inject(ThemeStore);
        TestBed.tick();

        expect(store.theme()).toBe('glass');
        expect(document.documentElement.dataset['theme']).toBe('glass');
    });

    it('should put the theme on <html> and remember it', () => {
        const store = TestBed.inject(ThemeStore);
        store.theme.set('code');
        TestBed.tick();

        expect(document.documentElement.dataset['theme']).toBe('code');
        expect(localStorage.getItem('theme')).toBe('code');
    });

    it('should start with the remembered theme, but not with an unknown one', () => {
        localStorage.setItem('theme', 'code');
        expect(TestBed.inject(ThemeStore).theme()).toBe('code');

        TestBed.resetTestingModule();
        localStorage.setItem('theme', 'windows-xp');
        expect(TestBed.inject(ThemeStore).theme()).toBe('glass');
    });

    it('should pick a theme with the red and green buttons', () => {
        const store = TestBed.inject(ThemeStore);

        expect(store.themeFor('F16')).toBe('glass');
        expect(store.themeFor('F17')).toBe('code');
        expect(store.themeFor('F18')).toBeUndefined();
        expect(store.themeFor('F19')).toBeUndefined();
    });
});
