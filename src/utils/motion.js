import { MOTION_SAMPLE } from '../config';

/** Measures how much the picture changes between frames (0 = still). */
export function createMotionMeter(video) {
  const { WIDTH, HEIGHT, SMOOTHING, LUMA } = MOTION_SAMPLE;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let previous = null;
  let motion = 0;

  return {
    measure() {
      ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);
      const data = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
      const luma = new Float32Array(WIDTH * HEIGHT);
      let totalDiff = 0;
      for (let i = 0; i < luma.length; i++) {
        luma[i] = data[i * 4] * LUMA.R + data[i * 4 + 1] * LUMA.G + data[i * 4 + 2] * LUMA.B;
        if (previous) totalDiff += Math.abs(luma[i] - previous[i]);
      }
      if (previous) motion = motion * SMOOTHING + (totalDiff / luma.length) * (1 - SMOOTHING);
      previous = luma;
      return motion;
    },
  };
}
