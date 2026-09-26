import { Subject } from 'rxjs';
import { Component } from '@angular/core';
import { TvRadioComponent } from './tv-radio.component';
import { RadioService } from '@data/services/radio.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeyboardEventKey } from '@data/models/keyboard-event-key.type';
import { RadioServiceMock } from '@data/services/mocks/radio.service.mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

@Component({ selector: 'app-tv-npmfeed', template: '' })
class TvNpmfeedStubComponent {}

describe('TvRadioComponent', () => {
    let component: TvRadioComponent;
    let fixture: ComponentFixture<TvRadioComponent>;
    let radioService: RadioServiceMock;
    let keyDownSubject: Subject<KeyboardEventKey>;

    beforeEach(async () => {
        vi.useFakeTimers();

        TestBed.configureTestingModule({
            providers: [{ provide: RadioService, useClass: RadioServiceMock }],
        });
        TestBed.overrideComponent(TvRadioComponent, {
            set: { imports: [TvNpmfeedStubComponent] },
        });

        radioService = TestBed.inject(RadioService) as unknown as RadioServiceMock;
        vi.spyOn(radioService, 'getNowPlaying');

        keyDownSubject = new Subject<KeyboardEventKey>();
        fixture = TestBed.createComponent(TvRadioComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('keyDownSubject', keyDownSubject);
        fixture.componentRef.setInput('overlay', true);
        fixture.detectChanges();
        await fixture.whenStable();
    });

    afterEach(() => vi.useRealTimers());

    const audio = (): HTMLAudioElement => fixture.nativeElement.querySelector('audio');

    it('should start the first channel after the first render', () => {
        expect(audio().src).toBe(radioService.radioChannels[0].file);
        expect(audio().volume).toBe(0.5);
        expect(audio().play).toHaveBeenCalled();
    });

    it('should fetch what is playing on init and every 30 seconds', () => {
        expect(radioService.getNowPlaying).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1000 * 30);

        expect(radioService.getNowPlaying).toHaveBeenCalledTimes(2);
    });

    describe('nowPlayingSong / nowPlayingArtist', () => {
        it('should read KINK responses', () => {
            component.nowPlaying.set(radioService.kinkResponse);

            expect(component.nowPlayingSong()).toBe('kink_song');
            expect(component.nowPlayingArtist()).toBe('kink_artist');
        });

        it('should read FLUX responses', () => {
            component.nowPlaying.set(radioService.fluxResponse);

            expect(component.nowPlayingSong()).toBe('flux_song');
            expect(component.nowPlayingArtist()).toBe('flux_artistCredits');
        });

        it('should read DNB responses', () => {
            component.nowPlaying.set(radioService.dnbResponse);

            expect(component.nowPlayingSong()).toBe('dnb_song');
            expect(component.nowPlayingArtist()).toBe('dnb_artist');
        });

        it('should return empty strings when nothing is known', () => {
            component.nowPlaying.set(undefined);

            expect(component.nowPlayingSong()).toBe('');
            expect(component.nowPlayingArtist()).toBe('');
        });
    });

    describe('setSelectedChannel()', () => {
        it('should set selectedChannelIndex', () => {
            component.setSelectedChannel(2);
            expect(component.selectedChannelIndex()).toBe(2);
        });

        it('should ignore indexes out of range', () => {
            component.setSelectedChannel(-1);
            component.setSelectedChannel(radioService.radioChannels.length);

            expect(component.selectedChannelIndex()).toBe(0);
        });
    });

    describe('setNowPlayingChannel()', () => {
        it('should play the selected channel', () => {
            component.setSelectedChannel(1);

            component.setNowPlayingChannel();

            expect(component.nowPlayingChannelIndex()).toBe(1);
            expect(audio().src).toBe(radioService.radioChannels[1].file);
            expect(radioService.getNowPlaying).toHaveBeenLastCalledWith(
                radioService.radioChannels[1],
            );
        });
    });

    describe('keyboard', () => {
        it('should ignore keys when the overlay is closed', () => {
            fixture.componentRef.setInput('overlay', false);
            fixture.detectChanges();

            keyDownSubject.next('ArrowDown');

            expect(component.selectedChannelIndex()).toBe(0);
        });

        it('should move the selection with "ArrowDown" and "ArrowUp"', () => {
            keyDownSubject.next('ArrowDown');
            keyDownSubject.next('ArrowDown');
            expect(component.selectedChannelIndex()).toBe(2);

            keyDownSubject.next('ArrowUp');
            expect(component.selectedChannelIndex()).toBe(1);
        });

        it('should play the selected channel on "Enter"', () => {
            keyDownSubject.next('ArrowDown');
            keyDownSubject.next('Enter');

            expect(component.nowPlayingChannelIndex()).toBe(1);
        });

        it('should reset the selection to the playing channel on "Backspace"', () => {
            keyDownSubject.next('ArrowDown');
            keyDownSubject.next('Backspace');

            expect(component.selectedChannelIndex()).toBe(0);
        });

        it('should render the selected channel', () => {
            keyDownSubject.next('ArrowDown');
            fixture.detectChanges();

            const items = fixture.nativeElement.querySelectorAll('.channels li');

            expect(items[1].classList).toContain('selected');
            expect(items[0].classList).not.toContain('selected');
        });
    });
});
