import { afterEach, describe, expect, it, vi } from 'vitest';
import { averageColor, smallCover } from './cover';

describe('smallCover()', () => {
    it('should ask for the 300px cover instead of the 640px one', () => {
        expect(smallCover('https://i.scdn.co/image/ab67616d0000b2734bc9bcdbdc9ac34e37d8b6bb')).toBe(
            'https://i.scdn.co/image/ab67616d00001e024bc9bcdbdc9ac34e37d8b6bb',
        );
    });

    it('should leave other URLs alone', () => {
        expect(smallCover('https://example.com/cover.jpg')).toBe('https://example.com/cover.jpg');
    });
});

describe('averageColor()', () => {
    const image = document.createElement('img');

    afterEach(() => vi.restoreAllMocks());

    const mockCanvas = (getImageData: () => { data: number[] }): void => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            drawImage: vi.fn(),
            getImageData,
        } as unknown as CanvasRenderingContext2D);
    };

    it('should average the pixels', () => {
        // Half red, half blue
        const data = Array.from({ length: 64 }, (_, pixel) =>
            pixel < 32 ? [255, 0, 0, 255] : [0, 0, 255, 255],
        ).flat();
        mockCanvas(() => ({ data }));

        expect(averageColor(image)).toBe('rgb(128 0 128)');
    });

    it("should give up on a cover the browser won't read", () => {
        mockCanvas(() => {
            throw new DOMException('Tainted canvas', 'SecurityError');
        });

        expect(averageColor(image)).toBeUndefined();
    });
});
