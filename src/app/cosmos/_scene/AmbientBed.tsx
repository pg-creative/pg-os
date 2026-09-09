"use client";

/**
 * The world is never silent, and never loud without permission.
 *
 * EXTENDS: `_components/SoundProvider.tsx` and `src/lib/sound.ts`. Same
 * localStorage key (`pg-os-sound-enabled`), same unlock gesture, same toggle
 * semantics. Turning sound on here turns it on for the whole OS, which is the
 * point of extending rather than building a second audio system with its own
 * memory.
 *
 * Round one shipped the bed. Round two adds the two sounds walking needs and
 * nothing else:
 *
 *   BED       filtered noise plus a slow LFO, one voice per biome, crossfaded
 *             over 1.5 s at a border. Riso is dry and bright, painted is warm
 *             and wide, watercolor is wet, the depths are a low room tone.
 *   FOOTSTEP  a 40 ms noise tick on the same stride the dust uses, so sound and
 *             picture are one gait. Detuned a little each step: a person on
 *             gravel, never a metronome.
 *   FIRE      a band of noise plus occasional pops, faded up only when he sits
 *             at the hearth, faded out when he stands.
 *
 * All of it is synthesized. No sample, no download, no licence, nothing to lose.
 * The context is created on the first real gesture and never before, so first
 * paint is silent and the autoplay policy has nothing to fight.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSound } from "../../_components/SoundProvider";
import { unlockAudio } from "../../../lib/sound";

/** Quiet enough to sit under a room, per the Worldsmith's constitution. */
const BED_GAIN = 0.07;
const CROSSFADE_S = 1.5;

export type BiomeVoice = "painted" | "riso" | "watercolor" | "paperback";

interface Voice {
  src: AudioBufferSourceNode;
  lp: BiquadFilterNode;
  hp: BiquadFilterNode;
  lfo: OscillatorNode;
  gain: GainNode;
  stop: () => void;
}

interface Rig {
  ctx: AudioContext;
  master: GainNode;
  noise: AudioBuffer;
  /** The two bed slots, so one can fade in while the other fades out. */
  slots: [Voice | null, Voice | null];
  active: 0 | 1;
  biome: BiomeVoice | null;
  fireGain: GainNode;
  fireStop: () => void;
  stepGain: GainNode;
}

/** Per-register bed character. Four numbers, and each biome sounds like itself. */
const VOICES: Record<BiomeVoice, { lp: number; hp: number; lfoHz: number; depth: number }> = {
  painted: { lp: 520, hp: 60, lfoHz: 1 / 22, depth: 160 },
  riso: { lp: 1400, hp: 180, lfoHz: 1 / 14, depth: 260 },
  watercolor: { lp: 760, hp: 90, lfoHz: 1 / 30, depth: 210 },
  paperback: { lp: 240, hp: 32, lfoHz: 1 / 40, depth: 70 },
};

function makeNoise(ctx: AudioContext, seconds = 8): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Brown-ish noise: integrated white, warmer than white, and it reads as air.
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  return buf;
}

function buildVoice(rig: Rig, kind: BiomeVoice): Voice {
  const { ctx } = rig;
  const v = VOICES[kind];

  const src = ctx.createBufferSource();
  src.buffer = rig.noise;
  src.loop = true;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = v.lp;
  lp.Q.value = 0.4;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = v.hp;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = v.lfoHz;
  const depth = ctx.createGain();
  depth.gain.value = v.depth;
  lfo.connect(depth).connect(lp.frequency);

  const gain = ctx.createGain();
  gain.gain.value = 0;

  src.connect(hp).connect(lp).connect(gain).connect(rig.master);
  src.start();
  lfo.start();

  return {
    src,
    lp,
    hp,
    lfo,
    gain,
    stop: () => {
      try {
        src.stop();
        lfo.stop();
      } catch {
        /* already stopped */
      }
      src.disconnect();
      lfo.disconnect();
      lp.disconnect();
      hp.disconnect();
      gain.disconnect();
      depth.disconnect();
    },
  };
}

function buildFire(rig: Rig): () => void {
  const { ctx } = rig;
  const src = ctx.createBufferSource();
  src.buffer = rig.noise;
  src.loop = true;

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 900;
  band.Q.value = 0.8;

  // The crackle: one LFO on the band gain, fast and shallow, so it spits.
  const lfo = ctx.createOscillator();
  lfo.type = "sawtooth";
  lfo.frequency.value = 7.3;
  const depth = ctx.createGain();
  depth.gain.value = 0.28;
  lfo.connect(depth).connect(rig.fireGain.gain);

  src.connect(band).connect(rig.fireGain).connect(rig.master);
  src.start();
  lfo.start();

  return () => {
    try {
      src.stop();
      lfo.stop();
    } catch {
      /* already stopped */
    }
    src.disconnect();
    band.disconnect();
    lfo.disconnect();
    depth.disconnect();
  };
}

export interface WorldSound {
  /** One footstep. Called on the stride, from the frame loop. */
  step: () => void;
  /** Crossfade the bed to another biome's voice. A no-op if it is already there. */
  setBiome: (kind: BiomeVoice) => void;
  /** Fade the hearth up or down. */
  setFire: (on: boolean) => void;
}

export function useWorldSound(enabled: boolean): WorldSound {
  const rigRef = useRef<Rig | null>(null);

  useEffect(() => {
    if (!enabled) {
      const rig = rigRef.current;
      rigRef.current = null;
      if (rig) {
        const t = rig.ctx.currentTime;
        rig.master.gain.cancelScheduledValues(t);
        rig.master.gain.setValueAtTime(rig.master.gain.value, t);
        rig.master.gain.linearRampToValueAtTime(0, t + 0.4);
        window.setTimeout(() => {
          rig.slots[0]?.stop();
          rig.slots[1]?.stop();
          rig.fireStop();
          void rig.ctx.close();
        }, 500);
      }
      return;
    }
    if (rigRef.current) return;

    type W = typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? (window as W).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const fireGain = ctx.createGain();
    fireGain.gain.value = 0;

    const stepGain = ctx.createGain();
    stepGain.gain.value = 0.5;
    stepGain.connect(master);

    const rig: Rig = {
      ctx,
      master,
      noise: makeNoise(ctx),
      slots: [null, null],
      active: 0,
      biome: null,
      fireGain,
      fireStop: () => {},
      stepGain,
    };
    rig.fireStop = buildFire(rig);
    rigRef.current = rig;

    const t = ctx.currentTime;
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(BED_GAIN, t + 2.2);

    return () => {
      rig.slots[0]?.stop();
      rig.slots[1]?.stop();
      rig.fireStop();
      void ctx.close();
      rigRef.current = null;
    };
  }, [enabled]);

  const setBiome = useCallback((kind: BiomeVoice) => {
    const rig = rigRef.current;
    if (!rig || rig.biome === kind) return;
    rig.biome = kind;

    const next: 0 | 1 = rig.active === 0 ? 1 : 0;
    const old = rig.slots[rig.active];
    const voice = buildVoice(rig, kind);
    rig.slots[next] = voice;
    rig.active = next;

    const t = rig.ctx.currentTime;
    voice.gain.gain.setValueAtTime(0, t);
    voice.gain.gain.linearRampToValueAtTime(1, t + CROSSFADE_S);
    if (old) {
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + CROSSFADE_S);
      window.setTimeout(() => old.stop(), (CROSSFADE_S + 0.4) * 1000);
    }
  }, []);

  const setFire = useCallback((on: boolean) => {
    const rig = rigRef.current;
    if (!rig) return;
    const t = rig.ctx.currentTime;
    rig.fireGain.gain.cancelScheduledValues(t);
    rig.fireGain.gain.setValueAtTime(rig.fireGain.gain.value, t);
    rig.fireGain.gain.linearRampToValueAtTime(on ? 0.34 : 0, t + 1.1);
  }, []);

  const step = useCallback(() => {
    const rig = rigRef.current;
    if (!rig) return;
    const { ctx } = rig;
    const t = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = rig.noise;
    // A different 40 ms of the same noise every step: gravel, not a metronome.
    const offset = Math.random() * (rig.noise.duration - 0.1);

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 420 + Math.random() * 180;
    bp.Q.value = 1.4;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.5 + Math.random() * 0.2, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    src.connect(bp).connect(env).connect(rig.stepGain);
    src.start(t, offset, 0.12);
    src.stop(t + 0.13);
    src.onended = () => {
      src.disconnect();
      bp.disconnect();
      env.disconnect();
    };
  }, []);

  return { step, setBiome, setFire };
}

/**
 * The visible, persistent mute. Sits beside the light toggle, never inside a
 * menu: the one control that must always be one click away.
 */
export function SoundToggle() {
  const { enabled, setEnabled } = useSound();
  return (
    <button
      type="button"
      className="cosmos-chip"
      aria-pressed={enabled}
      aria-label={enabled ? "Sound on, click to mute" : "Sound off, click to unmute"}
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        if (next) void unlockAudio();
      }}
    >
      <span aria-hidden>{enabled ? "♪" : "♪̸"}</span>
      <span>{enabled ? "sound" : "muted"}</span>
    </button>
  );
}

/** Arms the audio context on the first real gesture, and only then. */
export function useAudioArm(enabled: boolean): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!enabled || armed) return;
    const arm = () => {
      void unlockAudio();
      setArmed(true);
    };
    window.addEventListener("pointerdown", arm, { once: true, passive: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [enabled, armed]);
  return armed;
}
