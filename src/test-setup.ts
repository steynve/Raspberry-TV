/**
 * Vitest setup file for global test configuration
 */

import '@angular/compiler';
import { vi } from 'vitest';

if (typeof window !== 'undefined') {
    // Media playback is not implemented in jsdom
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
    // Not in jsdom: the channel list keeps its highlight in sight with it
    window.Element.prototype.scrollIntoView = vi.fn();
}
