// Spotify's cover URLs name their size: 640px by default, the 300px one is plenty for the TV and
// quicker for the Pi to decode
const SIZE_640 = 'ab67616d0000b273';
const SIZE_300 = 'ab67616d00001e02';

export const smallCover = (url: string): string => url.replace(SIZE_640, SIZE_300);

// Scaled down to a few pixels by the browser, then averaged: the cover's overall colour, as
// "rgb(r g b)". Needs the image loaded with CORS, or the canvas won't give its pixels back.
const SAMPLE = 8;

export const averageColor = (image: CanvasImageSource): string | undefined => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SAMPLE;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) return undefined;

    try {
        context.drawImage(image, 0, 0, SAMPLE, SAMPLE);
        const { data } = context.getImageData(0, 0, SAMPLE, SAMPLE);
        const total = [0, 0, 0];

        for (let index = 0; index < data.length; index += 4) {
            total[0] += data[index];
            total[1] += data[index + 1];
            total[2] += data[index + 2];
        }

        const [red, green, blue] = total.map((sum) => Math.round(sum / (SAMPLE * SAMPLE)));

        return `rgb(${red} ${green} ${blue})`;
    } catch {
        // A cover without CORS headers "taints" the canvas
        return undefined;
    }
};
