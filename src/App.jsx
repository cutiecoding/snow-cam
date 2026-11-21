import { useEffect, useRef, useState } from 'react';
import Hud from './components/Hud';
import StartScreen from './components/StartScreen';
import { useSnowCam } from './hooks/useSnowCam';

export default function App() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [hudVisible, setHudVisible] = useState(true);
  const { phase, coverage, start, shakeOff } = useSnowCam(canvasRef, videoRef);
  const isRunning = phase === 'running';

  useEffect(() => {
    const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

    const onKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        shakeOff();
      } else if (event.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (event.key.toLowerCase() === 'h') {
        setHudVisible((visible) => !visible);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shakeOff]);

  return (
    <>
      <video ref={videoRef} className="hidden-video" playsInline muted />
      <canvas ref={canvasRef} className={isRunning ? 'stage' : 'stage stage--hidden'} />
      {!isRunning && <StartScreen phase={phase} onStart={start} />}
      {isRunning && hudVisible && <Hud coverage={coverage} />}
    </>
  );
}
