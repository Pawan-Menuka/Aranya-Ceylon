import manifest from './media-manifest.json';

const images: Record<string, string> = manifest.images;
export const HERO_MEDIA_PREFIX = manifest.heroPrefix;
export const HERO_POSTER = `${HERO_MEDIA_PREFIX}/poster.webp`;

export function versionedImage(src: string): string {
  return images[src] ?? src;
}
