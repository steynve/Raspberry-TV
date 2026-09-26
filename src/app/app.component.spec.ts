import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { beforeEach, describe, expect, it } from 'vitest';

@Component({
    selector: 'app-tv',
    template: '',
})
class TvStubComponent {}

describe('AppComponent', () => {
    beforeEach(() => {
        TestBed.overrideComponent(AppComponent, { set: { imports: [TvStubComponent] } });
    });

    it('should render the tv', () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('app-tv')).toBeTruthy();
    });
});
