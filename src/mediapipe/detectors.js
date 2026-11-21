import { MEDIAPIPE } from '../config';
import { createMaskReader } from '../utils/mask';

const locateFile = (pkg) => (file) => `${MEDIAPIPE.CDN}/${pkg}@${MEDIAPIPE.VERSIONS[pkg]}/${file}`;
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/**
 * Wraps the three MediaPipe models (person mask, hands, face) behind one start/stop.
 * Handlers: onPersonMask(Uint8Array), onHands(landmarkSets[]), onFace(detection | undefined)
 */
export function createDetectors({ onPersonMask, onHands, onFace }) {
  const { SelfieSegmentation, Hands, FaceDetection } = window; // loaded by <script> tags in index.html
  const readMask = createMaskReader();

  const segmenter = new SelfieSegmentation({ locateFile: locateFile('selfie_segmentation') });
  segmenter.setOptions({ modelSelection: 1 });
  segmenter.onResults((results) => onPersonMask(readMask(results.segmentationMask)));

  const hands = new Hands({ locateFile: locateFile('hands') });
  hands.setOptions({ maxNumHands: 2, modelComplexity: 0, minDetectionConfidence: MEDIAPIPE.MIN_CONFIDENCE, minTrackingConfidence: MEDIAPIPE.MIN_CONFIDENCE });
  hands.onResults((results) => onHands(results.multiHandLandmarks || []));

  const face = new FaceDetection({ locateFile: locateFile('face_detection') });
  face.setOptions({ model: 'short', minDetectionConfidence: MEDIAPIPE.MIN_CONFIDENCE });
  face.onResults((results) => onFace(results.detections?.[0]));

  let running = false;

  async function run(video) {
    while (running) {
      if (video.readyState >= 2) {
        try {
          await segmenter.send({ image: video });
          await hands.send({ image: video });
          await face.send({ image: video });
        } catch (error) {
          console.error('Detection failed:', error);
        }
      }
      await nextFrame();
    }
  }

  return {
    start(video) {
      running = true;
      run(video);
    },
    stop() {
      running = false;
    },
  };
}
