/**
 * PG OS — Sound design v0
 *
 * Three Web Audio chimes. No external samples. Pure oscillators with
 * AudioParam.linearRampToValueAtTime envelopes (no setTimeout).
 *
 * - capture: brief, neutral confirmation when something is filed
 * - ship:    warmer, slightly longer, satisfaction on a successful ship
 * - tierUp:  triad on a season-tier crossing
 *
 * Each chime is ≤ 350ms, peak ≤ -12dBFS (gain ~0.25 against unity).
 *
 * AudioContext is lazily created on first user gesture (Safari requirement).
 * `prefers-reduced-motion: reduce` mutes all chimes.
 */

export type ChimeName = "capture" | "ship" | "tierUp";

let _ctx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  type W = typeof window & { webkitAudioContext?: typeof AudioContext };
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as W).webkitAudioContext;
  if (!Ctor) return null;
  try {
    _ctx = new Ctor();
  } catch {
    return null;
  }
  return _ctx;
}

function reducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Resume the AudioContext if it was suspended by autoplay policy.
 * Call from any user-gesture handler before the first chime.
 */
export async function unlockAudio(): Promise<void> {
  const c = ctx();
  if (!c) return;
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* ignore — chime will silently no-op */
    }
  }
}

interface OscillatorSpec {
  freq: number;
  type?: OscillatorType;
  gain?: number; // 0..1, peak gain for this oscillator
  start?: number; // seconds offset from t0
  duration?: number; // seconds
  attack?: number; // seconds
  release?: number; // seconds
}

function playOscillator(c: AudioContext, dest: AudioNode, t0: number, spec: OscillatorSpec) {
  const { freq, type = "sine", gain = 0.18, start = 0, duration = 0.18, attack = 0.005, release = 0.12 } = spec;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = 0;
  osc.connect(g);
  g.connect(dest);
  const begin = t0 + start;
  const peak = begin + attack;
  const sustainEnd = begin + duration;
  const end = sustainEnd + release;
  g.gain.setValueAtTime(0, begin);
  g.gain.linearRampToValueAtTime(gain, peak);
  g.gain.linearRampToValueAtTime(gain, sustainEnd);
  g.gain.linearRampToValueAtTime(0, end);
  osc.start(begin);
  osc.stop(end + 0.02);
}

export function play(name: ChimeName): void {
  if (reducedMotion()) return;
  const c = ctx();
  if (!c) return;
  // Fire-and-forget unlock; if still suspended chime is silent rather than queued.
  if (c.state === "suspended") {
    void c.resume().catch(() => {});
  }
  const out = c.createGain();
  out.gain.value = 0.25; // master peak headroom (~-12dBFS)
  out.connect(c.destination);
  const t0 = c.currentTime + 0.005;

  switch (name) {
    case "capture":
      // single soft sine — A5 (880) brief tap
      playOscillator(c, out, t0, { freq: 880, type: "sine", gain: 0.6, attack: 0.004, duration: 0.06, release: 0.18 });
      playOscillator(c, out, t0, { freq: 1318.51, type: "sine", gain: 0.18, start: 0.01, attack: 0.004, duration: 0.04, release: 0.14 });
      break;

    case "ship":
      // perfect-fourth ladder: E5 → A5 with sine + faint triangle shimmer
      playOscillator(c, out, t0, { freq: 659.25, type: "sine", gain: 0.55, attack: 0.005, duration: 0.09, release: 0.18 });
      playOscillator(c, out, t0, { freq: 880, type: "sine", gain: 0.5, start: 0.085, attack: 0.005, duration: 0.1, release: 0.22 });
      playOscillator(c, out, t0, { freq: 1760, type: "triangle", gain: 0.08, start: 0.085, attack: 0.005, duration: 0.08, release: 0.18 });
      break;

    case "tierUp":
      // major triad arpeggio — C5, E5, G5 → settle on C6
      playOscillator(c, out, t0, { freq: 523.25, type: "sine", gain: 0.5, attack: 0.005, duration: 0.06, release: 0.12 });
      playOscillator(c, out, t0, { freq: 659.25, type: "sine", gain: 0.5, start: 0.06, attack: 0.005, duration: 0.06, release: 0.12 });
      playOscillator(c, out, t0, { freq: 783.99, type: "sine", gain: 0.5, start: 0.12, attack: 0.005, duration: 0.06, release: 0.12 });
      playOscillator(c, out, t0, { freq: 1046.5, type: "sine", gain: 0.6, start: 0.18, attack: 0.005, duration: 0.1, release: 0.18 });
      playOscillator(c, out, t0, { freq: 2093, type: "triangle", gain: 0.06, start: 0.18, attack: 0.005, duration: 0.1, release: 0.18 });
      break;
  }
}
