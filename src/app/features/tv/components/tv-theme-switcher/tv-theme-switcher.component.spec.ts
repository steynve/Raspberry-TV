import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Theme, ThemeStore } from '@data/stores/theme.store';
import { TvThemeSwitcherComponent } from './tv-theme-switcher.component';

describe('TvThemeSwitcherComponent', () => {
    let fixture: ComponentFixture<TvThemeSwitcherComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [{ provide: ThemeStore, useValue: { theme: signal<Theme>('code') } }],
        });

        fixture = TestBed.createComponent(TvThemeSwitcherComponent);
        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();
    });

    it('should list the themes in the order of the colour buttons, with the current one marked', () => {
        const options = [...fixture.nativeElement.querySelectorAll('.option')] as HTMLElement[];

        expect(options.map((option) => option.textContent?.trim())).toEqual(['Glass', 'Code']);
        expect(options[1].classList).toContain('current');
        expect(
            options.map((option) => option.querySelector('.button')?.getAttribute('data-key')),
        ).toEqual(['F16', 'F17']);
    });

    it('should only show while visible', () => {
        expect(fixture.nativeElement.classList).toContain('visible');

        fixture.componentRef.setInput('visible', false);
        fixture.detectChanges();

        expect(fixture.nativeElement.classList).not.toContain('visible');
    });
});
