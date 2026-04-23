const BARS = 80;
const DEFAULT_PROGRESS = 0.34;

export function Waveform({ progress }: { progress?: number } = {}) {
  const p = progress ?? DEFAULT_PROGRESS;
  const bars = Array.from({ length: BARS }, (_, i) => {
    const raw = 20 + Math.abs(Math.sin(i * 0.37 + i * i * 0.013)) * 70;
    const h = raw.toFixed(2); // stable server+client string
    const played = i / BARS < p;
    const active = Math.abs(i / BARS - p) < 0.012;
    const cls = played ? "played" : active ? "active" : "";
    return { h, cls, i };
  });
  return (
    <div className="waveform">
      {bars.map((b) => (
        <div key={b.i} className={`bar ${b.cls}`} style={{ height: `${b.h}%` }} />
      ))}
    </div>
  );
}
