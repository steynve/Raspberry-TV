// The parts of a Pexels search the app uses
export interface Photos {
    photos: PhotosPhoto[];
}

export interface PhotosPhoto {
    avg_color: string;
    src: { original: string };
}
