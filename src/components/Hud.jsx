export default function Hud({ coverage }) {
  const percent = Math.round(Math.min(coverage, 1) * 100);
  return (
    <div className="hud">
      snow {percent}% · hold hand still: snowball · swing: throw · space: shake off · F: fullscreen · H: hide
    </div>
  );
}
