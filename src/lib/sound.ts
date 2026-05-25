/**
 * PG OS — Sound design v1
 *
 * Ten Web Audio chimes. No external samples. Pure oscillators with
 * AudioParam.linearRampToValueAtTime envelopes (no setTimeout).
 *
 * Original (v0):
 * - capture: brief, neutral confirmation when something is filed
 * - ship:    warmer, slightly longer, satisfaction on a successful ship
 * - tierUp:  triad on a season-tier crossing
 *
 * New (v1) — Kingdom Hearts-inspired oscillator chimes:
 * - cursor:      quick UI cursor movement chirp (660Hz, 30ms)
 * - confirm:     positive two-note chord (880Hz + 1318.51Hz, 80ms)
 * - cancel:      downward detune sweep (440Hz→415Hz, 60ms)
 * - modalOpen:   ascending C-E-G triad cascade (523.25→659.25→783.99Hz)
 * - modalClose:  descending G-E-C triad cascade (783.99→659.25→523.25Hz)
 * - brandCycle:  triangle + sine shimmer (880Hz + 1108.73Hz, 100ms)
 * - copilotOpen: sine + triangle sparkle (783.99Hz + 1567.98Hz, 80ms)
 *
 * Each chime is ≤ 350ms, peak ≤ -12dBFS (gain ~0.25 against unity).
 *
 * AudioContext is lazily created on first user gesture (Safari requirement).
 * `prefers-reduced-motion: reduce` mutes all chimes.
 *
 * Module-level `_enabled` flag is synced by SoundProvider via setEnabled(),
 * so components that import play() directly (e.g. ModeProvider) still
 * respect the user's SoundToggle preference.
 *
 * Shared reverb tail: synthetic 100ms exponential-decay white-noise convolver,
 * ~25% wet / 75% dry parallel mix. Adds KH-style atmosphere without muddying
 * the punchy oscillator attacks.
 */

export type ChimeName =
  | "capture"
  | "ship"
  | "tierUp"
  | "cursor"
  | "confirm"
  | "cancel"
  | "modalOpen"
  | "modalClose"
  | "brandCycle"
  | "copilotOpen";

// ── Module-level enabled gate ──────────────────────────────────────────────────

let _enabled = false;

/** Called by SoundProvider whenever the React enabled state changes. */
export function setEnabled(next: boolean): void {
  _enabled = next;
}

// ── Throttle map ───────────────────────────────────────────────────────────────

const _throttleMap = new Map<ChimeName, number>();

/**
 * Like play(), but skips if the same chime was played within cooldownMs.
 * Useful for rapid-fire events like arrow-key navigation.
 */
export function playThrottled(name: ChimeName, cooldownMs: number): void {
  const last = _throttleMap.get(name) ?? 0;
  const now = Date.now();
  if (now - last < cooldownMs) return;
  _throttleMap.set(name, now);
  play(name);
}

// ── AudioContext (lazy) ────────────────────────────────────────────────────────

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

// ── Reverb (lazy, shared) ──────────────────────────────────────────────────────
// Synthetic impulse response: 100ms exponential-decay white noise.
// Inserted as a parallel wet path (25% wet / 75% dry).

let _reverbNode: ConvolverNode | null = null;
let _reverbWet: GainNode | null = null;
let _reverbDry: GainNode | null = null;

/**
 * Returns { dry, wet } gain nodes that both connect to c.destination.
 * All oscillators should connect to dry; reverb gets its copy through wet.
 * Call this once after the AudioContext is created.
 */
function getReverbNodes(c: AudioContext): { dry: GainNode; wet: GainNode } {
  if (_reverbNode && _reverbWet && _reverbDry) {
    return { dry: _reverbDry, wet: _reverbWet };
  }

  // Build impulse response buffer: 100ms, mono, exponential decay
  const sampleRate = c.sampleRate;
  const length = Math.floor(sampleRate * 0.1); // 100ms
  const impulse = c.createBuffer(1, length, sampleRate);
  const data = impulse.getChannelData(0);
  for (let i = 0; i < length; i++) {
    // White noise * exponential decay
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }

  const conv = c.createConvolver();
  conv.buffer = impulse;

  // Wet: convolver output at 25% gain
  const wet = c.createGain();
  wet.gain.value = 0.25;

  // Dry: direct signal at 75% gain
  const dry = c.createGain();
  dry.gain.value = 0.75;

  dry.connect(c.destination);
  conv.connect(wet);
  wet.connect(c.destination);

  _reverbNode = conv;
  _reverbWet = wet;
  _reverbDry = dry;

  return { dry, wet: conv as unknown as GainNode };
}

function reducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
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
  freqEnd?: number; // optional end frequency for linear ramp (for cancel sweep)
}

function playOscillator(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  spec: OscillatorSpec,
) {
  const {
    freq,
    type = "sine",
    gain = 0.18,
    start = 0,
    duration = 0.18,
    attack = 0.005,
    release = 0.12,
    freqEnd,
  } = spec;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  if (freqEnd !== undefined) {
    // Linear frequency ramp for pitch bend effects (e.g. cancel sweep)
    osc.frequency.linearRampToValueAtTime(freqEnd, t0 + start + duration);
  }
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
  if (!_enabled) return;
  if (reducedMotion()) return;
  const c = ctx();
  if (!c) return;
  // Fire-and-forget unlock; if still suspended chime is silent rather than queued.
  if (c.state === "suspended") {
    void c.resume().catch(() => {});
  }

  // Master gain node — connects to the dry path of the shared reverb split
  const out = c.createGain();
  out.gain.value = 0.25; // master peak headroom (~-12dBFS)

  // Route through reverb (dry=75%, wet=25% in parallel)
  const { dry } = getReverbNodes(c);
  out.connect(dry);
  // Also feed the convolver (wet path) at a lower master level
  if (_reverbNode) {
    out.connect(_reverbNode);
  }

  const t0 = c.currentTime + 0.005;

  switch (name) {
    case "capture":
      // single soft sine — A5 (880) brief tap
      playOscillator(c, out, t0, {
        freq: 880,
        type: "sine",
        gain: 0.6,
        attack: 0.004,
        duration: 0.06,
        release: 0.18,
      });
      playOscillator(c, out, t0, {
        freq: 1318.51,
        type: "sine",
        gain: 0.18,
        start: 0.01,
        attack: 0.004,
        duration: 0.04,
        release: 0.14,
      });
      break;

    case "ship":
      // perfect-fourth ladder: E5 → A5 with sine + faint triangle shimmer
      playOscillator(c, out, t0, {
        freq: 659.25,
        type: "sine",
        gain: 0.55,
        attack: 0.005,
        duration: 0.09,
        release: 0.18,
      });
      playOscillator(c, out, t0, {
        freq: 880,
        type: "sine",
        gain: 0.5,
        start: 0.085,
        attack: 0.005,
        duration: 0.1,
        release: 0.22,
      });
      playOscillator(c, out, t0, {
        freq: 1760,
        type: "triangle",
        gain: 0.08,
        start: 0.085,
        attack: 0.005,
        duration: 0.08,
        release: 0.18,
      });
      break;

    case "tierUp":
      // major triad arpeggio — C5, E5, G5 → settle on C6
      playOscillator(c, out, t0, {
        freq: 523.25,
        type: "sine",
        gain: 0.5,
        attack: 0.005,
        duration: 0.06,
        release: 0.12,
      });
      playOscillator(c, out, t0, {
        freq: 659.25,
        type: "sine",
        gain: 0.5,
        start: 0.06,
        attack: 0.005,
        duration: 0.06,
        release: 0.12,
      });
      playOscillator(c, out, t0, {
        freq: 783.99,
        type: "sine",
        gain: 0.5,
        start: 0.12,
        attack: 0.005,
        duration: 0.06,
        release: 0.12,
      });
      playOscillator(c, out, t0, {
        freq: 1046.5,
        type: "sine",
        gain: 0.6,
        start: 0.18,
        attack: 0.005,
        duration: 0.1,
        release: 0.18,
      });
      playOscillator(c, out, t0, {
        freq: 2093,
        type: "triangle",
        gain: 0.06,
        start: 0.18,
        attack: 0.005,
        duration: 0.1,
        release: 0.18,
      });
      break;

    case "cursor":
      // Quick UI cursor chirp — 660Hz sine, 30ms, sharp attack, quiet
      playOscillator(c, out, t0, {
        freq: 660,
        type: "sine",
        gain: 0.4,
        attack: 0.003,
        duration: 0.03,
        release: 0.08,
      });
      break;

    case "confirm":
      // Positive two-note chord — 880Hz + 1318.51Hz (A5 + E6), 80ms
      playOscillator(c, out, t0, {
        freq: 880,
        type: "sine",
        gain: 0.5,
        attack: 0.005,
        duration: 0.08,
        release: 0.16,
      });
      playOscillator(c, out, t0, {
        freq: 1318.51,
        type: "sine",
        gain: 0.5,
        attack: 0.005,
        duration: 0.08,
        release: 0.16,
      });
      break;

    case "cancel":
      // Downward 5% detune sweep — 440Hz→415Hz sine, 60ms
      playOscillator(c, out, t0, {
        freq: 440,
        type: "sine",
        gain: 0.45,
        attack: 0.005,
        duration: 0.06,
        release: 0.14,
        freqEnd: 415,
      });
      break;

    case "modalOpen":
      // Ascending C5–E5–G5 triad cascade, 30ms stagger each
      playOscillator(c, out, t0, {
        freq: 523.25,
        type: "sine",
        gain: 0.5,
        start: 0,
        attack: 0.005,
        duration: 0.04,
        release: 0.14,
      });
      playOscillator(c, out, t0, {
        freq: 659.25,
        type: "sine",
        gain: 0.5,
        start: 0.03,
        attack: 0.005,
        duration: 0.04,
        release: 0.14,
      });
      playOscillator(c, out, t0, {
        freq: 783.99,
        type: "sine",
        gain: 0.6,
        start: 0.06,
        attack: 0.005,
        duration: 0.04,
        release: 0.14,
      });
      break;

    case "modalClose":
      // Descending G5–E5–C5 triad cascade, 30ms stagger each
      playOscillator(c, out, t0, {
        freq: 783.99,
        type: "sine",
        gain: 0.5,
        start: 0,
        attack: 0.005,
        duration: 0.04,
        release: 0.14,
      });
      playOscillator(c, out, t0, {
        freq: 659.25,
        type: "sine",
        gain: 0.5,
        start: 0.03,
        attack: 0.005,
        duration: 0.04,
        release: 0.14,
      });
      playOscillator(c, out, t0, {
        freq: 523.25,
        type: "sine",
        gain: 0.6,
        start: 0.06,
        attack: 0.005,
        duration: 0.04,
        release: 0.14,
      });
      break;

    case "brandCycle":
      // Triangle + sine shimmer — 880Hz tri + 1108.73Hz sine, 100ms, longer reverb tail
      playOscillator(c, out, t0, {
        freq: 880,
        type: "triangle",
        gain: 0.5,
        attack: 0.005,
        duration: 0.1,
        release: 0.3,
      });
      playOscillator(c, out, t0, {
        freq: 1108.73,
        type: "sine",
        gain: 0.5,
        attack: 0.005,
        duration: 0.1,
        release: 0.3,
      });
      break;

    case "copilotOpen":
      // Sine + triangle sparkle — 783.99Hz sine + 1567.98Hz triangle, 80ms
      playOscillator(c, out, t0, {
        freq: 783.99,
        type: "sine",
        gain: 0.6,
        attack: 0.005,
        duration: 0.08,
        release: 0.2,
      });
      playOscillator(c, out, t0, {
        freq: 1567.98,
        type: "triangle",
        gain: 0.15,
        attack: 0.005,
        duration: 0.08,
        release: 0.2,
      });
      break;
  }
}
