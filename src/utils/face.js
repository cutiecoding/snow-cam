import { BLUSH, FACE_KEYPOINT, GRID } from '../config';
import { lerpPoint } from './math';

/**
 * Finds both cheek centers (in grid cells) from a face detection.
 * Each cheek sits between the eye, the mouth and the ear.
 * Returns null when no face is visible.
 */
export function computeCheeks(detection, previous) {
  const keypoints = detection && (detection.landmarks || detection.keypoints);
  if (!keypoints || keypoints.length <= FACE_KEYPOINT.LEFT_EAR) return null;

  const mouth = keypoints[FACE_KEYPOINT.MOUTH];
  const cheekFor = (eye, ear) => ({
    x: (eye.x + (mouth.x - eye.x) * BLUSH.EYE_TO_MOUTH + (ear.x - eye.x) * BLUSH.EYE_TO_EAR) * GRID.WIDTH,
    y: (eye.y + (mouth.y - eye.y) * BLUSH.EYE_TO_MOUTH + (ear.y - eye.y) * BLUSH.EYE_TO_EAR) * GRID.HEIGHT,
  });

  const raw = [
    cheekFor(keypoints[FACE_KEYPOINT.RIGHT_EYE], keypoints[FACE_KEYPOINT.RIGHT_EAR]),
    cheekFor(keypoints[FACE_KEYPOINT.LEFT_EYE], keypoints[FACE_KEYPOINT.LEFT_EAR]),
  ];
  const points = previous ? raw.map((p, i) => lerpPoint(previous.points[i], p, BLUSH.SMOOTHING)) : raw;

  const faceWidth = (detection.boundingBox?.width ?? BLUSH.DEFAULT_FACE_WIDTH) * GRID.WIDTH;
  return { points, radius: faceWidth * BLUSH.RADIUS_FACTOR };
}
