"use client";

/**
 * AmbientBed — the world is never silent, and never loud without permission.
 *
 * EXTENDS: `_components/SoundProvider.tsx` and `src/lib/sound.ts`. Same
 * localStorage key (`pg-os-sound-enabled`), same unlock gesture (`unlockAudio()`
 * on the click that turns sound on), same toggle semantics. Turning sound on here
 * turns it on for the whole OS, which is the point of extending rather than
 * building a second audio system with its own memory.
 *
 * The bed itself is procedural: filtered noise plus a slow LFO through two
 * GainNodes. That is the floor the Worldsmith specified, "the only zero-risk,
 * zero-cost, guaranteed option", so no world is ever silent while it waits for a
 * recorded bed. `playBed(url)` is the seam a real file drops into: two gains
 * already exist so a world boundary can crossfade over 1 to 2 s.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSound } from "../../_components/SoundProvider";
import { unlockAudio } from "../../../lib/sound";

interface Bed {
  ctx: AudioContext;
  /** Two gains so a real bed can crossfade in over the procedural one. */
  gainA: GainNode;
  gainB: GainNode;
  master: GainNode;
  stop: () => void;
}

const TARGET_GAIN = 0.07; // quiet enough to sit under a room, per the constitution
const CROSSFADE_S = 1.5;

function buildProceduralBed(ctx: AudioContext, master: GainNode): () => void {
  // 8 s of noise, looped. Long enough that the ear cannot find the seam.
  const seconds = 8;
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Brown-ish noise: integrated white, which is warmer than white and reads as air.
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 520;
  lp.Q.value = 0.4;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 60;

  // The slow LFO: the room breathing, about one cycle every 22 s.
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 1 / 22;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 160;
  lfo.connect(lfoDepth).connect(lp.frequency);

  src.connect(hp).connect(lp).connect(master);
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
    lfo.disconnect();
    lp.disconnect();
    hp.disconnect();
  };
}

export function useAmbientBed(enabled: boolean) {
  const bedRef = useRef<Bed | null>(null);

  useEffect(() => {
    if (!enabled) {
      const bed = bedRef.current;
      if (bed) {
        const t = bed.ctx.currentTime;
        bed.master.gain.cancelScheduledValues(t);
        bed.master.gain.setValueAtTime(bed.master.gain.value, t);
        bed.master.gain.linearRampToValueAtTime(0, t + 0.4);
        window.setTimeout(() => {
          bed.stop();
          void bed.ctx.close();
        }, 500);
        bedRef.current = null;
      }
      return;
    }
    if (bedRef.current) return;

    type W = typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? (window as W).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const gainA = ctx.createGain();
    const gainB = ctx.createGain();
    gainA.gain.value = 1;
    gainB.gain.value = 0;
    gainA.connect(master);
    gainB.connect(master);

    const stop = buildProceduralBed(ctx, gainA);
    bedRef.current = { ctx, gainA, gainB, master, stop };

    const t = ctx.currentTime;
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(TARGET_GAIN, t + 2.2);

    return () => {
      stop();
      void ctx.close();
      bedRef.current = null;
    };
  }, [enabled]);

  /**
   * Swap in a recorded bed. Ready for a real file; nothing calls it in round one
   * because `worlds/quiet-practice/audio/bed.procedural` is a marker, not audio.
   */
  const playBed = useCallback(async (url: string) => {
    const bed = bedRef.current;
    if (!bed) return;
    const res = await fetch(url);
    const buf = await bed.ctx.decodeAudioData(await res.arrayBuffer());
    const src = bed.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(bed.gainB);
    src.start();
    const t = bed.ctx.currentTime;
    bed.gainA.gain.linearRampToValueAtTime(0, t + CROSSFADE_S);
    bed.gainB.gain.linearRampToValueAtTime(1, t + CROSSFADE_S);
  }, []);

  return { playBed };
}

/**
 * The visible, persistent mute. Sits beside the phase indicator, never inside a
 * menu: the one control that must always be one click away.
 */
export function AmbientBedToggle() {
  const { enabled, setEnabled } = useSound();
  const [armed, setArmed] = useState(false);
  useAmbientBed(enabled && armed);

  // The bed arms on the first real gesture, so first paint is silent and the
  // autoplay policy never has a suspended context to fight.
  useEffect(() => {
    if (!enabled) return;
    const arm = () => {
      void unlockAudio();
      setArmed(true);
    };
    window.addEventListener("pointerdown", arm, { once: true, passive: true });
    window.addEventListener("wheel", arm, { once: true, passive: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("wheel", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [enabled]);

  return (
    <button
      type="button"
      className="cosmos-chip"
      aria-pressed={enabled}
      aria-label={enabled ? "Sound on, click to mute" : "Sound off, click to unmute"}
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        if (next) {
          void unlockAudio();
          setArmed(true);
        }
      }}
    >
      <span aria-hidden>{enabled ? "♪" : "♪̸"}</span>
      <span>{enabled ? "sound" : "muted"}</span>
    </button>
  );
}
