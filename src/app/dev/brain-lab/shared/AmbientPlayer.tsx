"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";

// AmbientPlayer
// - Starts MUTED. First user click anywhere unmutes.
// - Crossfades between variants on theme change (transitionMs).
// - Pauses on tab blur via document.visibilitychange.
// - Renders a small mute toggle pill.
// - If theme.audio.pixabayLoopUrl is null, renders a "no audio" placeholder
//   (this is intentional during initial scaffolding — Pixabay URLs TBD).

export function AmbientPlayer() {
  const theme = useTheme();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [interacted, setInteracted] = useState(false);

  const url = theme.audio.pixabayLoopUrl;

  // Crossfade on variant change
  useEffect(() => {
    if (!url || !audioRef.current) return;
    const a = audioRef.current;
    if (a.src !== url) {
      // fade out, swap, fade in
      const fadeMs = theme.motion.transitionMs;
      const startVol = a.volume;
      const startedAt = performance.now();
      const fade = () => {
        const t = Math.min(1, (performance.now() - startedAt) / fadeMs);
        a.volume = startVol * (1 - t);
        if (t < 1) requestAnimationFrame(fade);
        else {
          a.src = url;
          a.load();
          a.volume = 0;
          if (!muted && interacted) {
            a.play().catch(() => {});
            const upStart = performance.now();
            const fadeUp = () => {
              const t2 = Math.min(1, (performance.now() - upStart) / fadeMs);
              a.volume = 0.45 * t2;
              if (t2 < 1) requestAnimationFrame(fadeUp);
            };
            requestAnimationFrame(fadeUp);
          }
        }
      };
      requestAnimationFrame(fade);
    }
  }, [url, theme.motion.transitionMs, muted, interacted]);

  // First-interaction unmute
  useEffect(() => {
    const onFirst = () => {
      setInteracted(true);
      document.removeEventListener("click", onFirst);
      document.removeEventListener("keydown", onFirst);
    };
    document.addEventListener("click", onFirst, { once: true });
    document.addEventListener("keydown", onFirst, { once: true });
    return () => {
      document.removeEventListener("click", onFirst);
      document.removeEventListener("keydown", onFirst);
    };
  }, []);

  // Tab blur pause
  useEffect(() => {
    if (!audioRef.current) return;
    const a = audioRef.current;
    const onVis = () => {
      if (document.hidden) a.pause();
      else if (!muted && interacted) a.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [muted, interacted]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (audioRef.current) {
        if (next) audioRef.current.pause();
        else audioRef.current.play().catch(() => {});
      }
      return next;
    });
  };

  return (
    <div className="bl-ambient">
      {url && (
        <audio
          ref={audioRef}
          src={url}
          loop
          preload="auto"
          autoPlay={interacted && !muted}
          muted={muted}
        />
      )}
      <button
        type="button"
        className="bl-ambient-toggle"
        onClick={toggleMute}
        aria-label={muted ? "Unmute ambient" : "Mute ambient"}
        title={
          url
            ? muted
              ? "ambient muted"
              : "ambient playing"
            : "no ambient configured"
        }
      >
        {url ? (muted ? "♪̸" : "♪") : "—"}
      </button>
    </div>
  );
}
