import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
    it('should mask the icon from the local assets', () => {
        const fixture = TestBed.createComponent(IconComponent);
        fixture.componentRef.setInput('name', 'sun');
        fixture.detectChanges();

        expect(fixture.nativeElement.style.getPropertyValue('--icon')).toBe(
            "url('/assets/icons/sun.svg')",
        );
        expect(fixture.nativeElement.getAttribute('aria-hidden')).toBe('true');
    });
});
