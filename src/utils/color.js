import { lerp } from './math';

/** Blends two [r, g, b] colors. t = 0 gives a, t = 1 gives b. */
export const mixColor = (a, b, t) => a.map((channel, i) => Math.round(lerp(channel, b[i], t)));

/** Writes one RGBA pixel into an ImageData buffer by cell index. */
export function setCell(pixels, index, [r, g, b], alpha = 255) {
  const offset = index * 4;
  pixels[offset] = r;
  pixels[offset + 1] = g;
  pixels[offset + 2] = b;
  pixels[offset + 3] = alpha;
}
