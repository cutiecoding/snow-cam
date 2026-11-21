const MESSAGES = {
  idle: 'Sit still and let it snow. Shake your head with both hands to clear it.',
  starting: 'Loading models...',
  error: 'Camera access failed. Open this page via localhost or https and allow the camera.',
};

export default function StartScreen({ phase, onStart }) {
  return (
    <div className="start">
      <h1>snow cam</h1>
      <p>{MESSAGES[phase]}</p>
      <button type="button" onClick={onStart} disabled={phase === 'starting'}>
        {phase === 'error' ? 'try again' : 'turn on camera'}
      </button>
    </div>
  );
}
