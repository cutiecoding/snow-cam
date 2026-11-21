import { useCallback, useEffect, useRef, useState } from 'react';
import { CAMERA, HUD_REFRESH_MS, SNOWBALL } from '../config';
import { SnowWorld } from '../engine/SnowWorld';
import { createRenderer } from '../engine/renderer';
import { createDetectors } from '../mediapipe/detectors';
import { HandTracker } from '../utils/hands';
import { computeCheeks } from '../utils/face';
import { createMotionMeter } from '../utils/motion';

/**
 * Owns the whole camera session: webcam, detectors, simulation and render loop.
 * phase: 'idle' | 'starting' | 'running' | 'error'
 */
export function useSnowCam(canvasRef, videoRef) {
  const [phase, setPhase] = useState('idle');
  const [coverage, setCoverage] = useState(0);
  const sessionRef = useRef(null);

  const start = useCallback(async () => {
    setPhase('starting');
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: CAMERA.WIDTH, height: CAMERA.HEIGHT } });
      video.srcObject = stream;
      await video.play();
      canvas.width = video.videoWidth || CAMERA.WIDTH;
      canvas.height = video.videoHeight || CAMERA.HEIGHT;

      const world = new SnowWorld();
      const renderer = createRenderer(canvas);
      const motionMeter = createMotionMeter(video);
      const handTracker = new HandTracker();
      const tracking = { palm: null, cheeks: null }; // latest detector output

      const detectors = createDetectors({
        onPersonMask: (mask) => world.setPersonMask(mask),
        onHands: (hands) => {
          const { palm, shakeDetected } = handTracker.update(hands);
          tracking.palm = palm;
          if (shakeDetected) world.shakeOff();
          if (palm && palm.speed > SNOWBALL.THROW_SPEED) world.throwHeldBall(palm);
        },
        onFace: (detection) => {
          tracking.cheeks = computeCheeks(detection, tracking.cheeks);
        },
      });

      let rafId = 0;
      const tick = () => {
        world.update({ motion: motionMeter.measure(), hand: tracking.palm });
        renderer.draw(video, world, tracking.cheeks);
        rafId = requestAnimationFrame(tick);
      };
      detectors.start(video);
      tick();

      const statsTimer = setInterval(() => setCoverage(world.coverage), HUD_REFRESH_MS);
      sessionRef.current = {
        world,
        stop() {
          cancelAnimationFrame(rafId);
          clearInterval(statsTimer);
          detectors.stop();
          stream.getTracks().forEach((track) => track.stop());
        },
      };
      setPhase('running');
    } catch (error) {
      console.error('Could not start:', error);
      setPhase('error');
    }
  }, [canvasRef, videoRef]);

  const shakeOff = useCallback(() => sessionRef.current?.world.shakeOff(), []);

  useEffect(() => () => sessionRef.current?.stop(), []);

  return { phase, coverage, start, shakeOff };
}
