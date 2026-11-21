import { GRID, GRID_CELLS, MASK_THRESHOLD } from '../config';

/**
 * Converts MediaPipe's segmentation image into a flat 0/1 grid (1 = person).
 * Depending on the build the mask lives in the red or the alpha channel,
 * so we pick whichever channel actually varies.
 */
export function createMaskReader() {
  const canvas = document.createElement('canvas');
  canvas.width = GRID.WIDTH;
  canvas.height = GRID.HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const result = new Uint8Array(GRID_CELLS);

  return function readMask(maskImage) {
    ctx.clearRect(0, 0, GRID.WIDTH, GRID.HEIGHT);
    ctx.drawImage(maskImage, 0, 0, GRID.WIDTH, GRID.HEIGHT);
    const data = ctx.getImageData(0, 0, GRID.WIDTH, GRID.HEIGHT).data;

    let redMin = 255, redMax = 0, alphaMin = 255, alphaMax = 0;
    for (let i = 0; i < GRID_CELLS; i++) {
      const red = data[i * 4];
      const alpha = data[i * 4 + 3];
      if (red < redMin) redMin = red;
      if (red > redMax) redMax = red;
      if (alpha < alphaMin) alphaMin = alpha;
      if (alpha > alphaMax) alphaMax = alpha;
    }
    const channel = alphaMax - alphaMin > redMax - redMin ? 3 : 0;

    for (let i = 0; i < GRID_CELLS; i++) {
      result[i] = data[i * 4 + channel] > MASK_THRESHOLD ? 1 : 0;
    }
    return result;
  };
}
