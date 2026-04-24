"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { CaptureSheet } from "./CaptureSheet";

const MAGNET_RADIUS = 120; // px — cursor distance that triggers attraction
const MAGNET_STRENGTH = 0.32; // fraction of delta applied

export function CaptureFAB() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const btnRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<number | null>(null);

  // Keyboard shortcut: Cmd/Ctrl + Shift + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Magnetic attraction — cursor-tracking that pulls the FAB toward the cursor
  useEffect(() => {
    const prefersReduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const onMove = (e: MouseEvent) => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const btn = btnRef.current;
        if (!btn || open) return;
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAGNET_RADIUS) {
          const factor = (1 - dist / MAGNET_RADIUS) * MAGNET_STRENGTH;
          btn.style.transform = `translate3d(${dx * factor}px, ${dy * factor}px, 0)`;
        } else {
          btn.style.transform = "translate3d(0, 0, 0)";
        }
      });
    };
    const reset = () => {
      if (btnRef.current) btnRef.current.style.transform = "translate3d(0, 0, 0)";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", reset);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", reset);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        className="capture-fab"
        onClick={() => setOpen(true)}
        aria-label="Open capture sheet"
        title="Capture (⌘⇧K)"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" fill="currentColor" />
          <path d="M5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0 1 1 0 0 1 2 0 7 7 0 0 1-6 6.92V21a1 1 0 0 1-2 0v-3.08A7 7 0 0 1 5 11z" fill="currentColor" />
        </svg>
      </button>
      {open && <CaptureSheet onClose={close} />}
    </>
  );
}
