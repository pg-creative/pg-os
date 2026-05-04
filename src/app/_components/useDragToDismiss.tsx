"use client";

/**
 * useDragToDismiss — vertical drag-to-dismiss for modal sheets.
 *
 * Detects vertical drag (touch + mouse) on the drag handle. Returns:
 *   - dragY: current Y offset in px (always >= 0; downward only)
 *   - isDragging: whether a drag gesture is in progress
 *   - isReducedMotion: passthrough for callers that want to skip the effect
 *   - handleProps: spread onto the drag handle element (top of sheet)
 *
 * Dismiss thresholds: drag > 120px OR velocity > 800 px/s.
 * Otherwise springs back to 0.
 *
 * The caller should apply `transform: translateY(${dragY}px)` to the sheet,
 * with a transition that's disabled while `isDragging` (so it follows the finger).
 */

import { useCallback, useEffect, useRef, useState } from "react";

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800; // px/s
const DAMPING_AFTER = 100; // px after which we damp 80%

interface DragHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  style: React.CSSProperties;
}

interface UseDragToDismissReturn {
  dragY: number;
  isDragging: boolean;
  isReducedMotion: boolean;
  handleProps: DragHandleProps;
}

export function useDragToDismiss(onDismiss: () => void): UseDragToDismissReturn {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const startYRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  // Detect prefers-reduced-motion once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const computeDragY = useCallback((rawDelta: number): number => {
    if (rawDelta <= 0) return 0;
    if (rawDelta <= DAMPING_AFTER) return rawDelta;
    const past = rawDelta - DAMPING_AFTER;
    return DAMPING_AFTER + past * 0.2; // 80% damping past threshold
  }, []);

  const finishDrag = useCallback(
    (finalDelta: number) => {
      const dismiss =
        finalDelta > DISMISS_DISTANCE ||
        velocityRef.current > DISMISS_VELOCITY;
      setIsDragging(false);
      if (dismiss) {
        // Animate to fully dismissed (handled by CSS via dragY -> high value)
        setDragY(window.innerHeight);
        // Wait for CSS transition before firing close
        setTimeout(() => {
          onDismiss();
          setDragY(0);
        }, 200);
      } else {
        // Spring back
        setDragY(0);
      }
    },
    [onDismiss],
  );

  // ── Mouse handlers ──────────────────────────────────────────────────────
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isReducedMotion) return;
      e.preventDefault();
      startYRef.current = e.clientY;
      lastYRef.current = e.clientY;
      startTimeRef.current = performance.now();
      lastTimeRef.current = startTimeRef.current;
      velocityRef.current = 0;
      setIsDragging(true);

      const handleMove = (ev: MouseEvent) => {
        const now = performance.now();
        const dt = now - lastTimeRef.current;
        const dy = ev.clientY - lastYRef.current;
        if (dt > 0) {
          velocityRef.current = (dy / dt) * 1000;
        }
        lastYRef.current = ev.clientY;
        lastTimeRef.current = now;
        const delta = ev.clientY - startYRef.current;
        setDragY(computeDragY(delta));
      };

      const handleUp = (ev: MouseEvent) => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
        const finalDelta = ev.clientY - startYRef.current;
        finishDrag(Math.max(0, finalDelta));
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [computeDragY, finishDrag, isReducedMotion],
  );

  // ── Touch handlers ──────────────────────────────────────────────────────
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isReducedMotion) return;
      const touch = e.touches[0];
      if (!touch) return;
      startYRef.current = touch.clientY;
      lastYRef.current = touch.clientY;
      startTimeRef.current = performance.now();
      lastTimeRef.current = startTimeRef.current;
      velocityRef.current = 0;
      setIsDragging(true);

      const handleMove = (ev: TouchEvent) => {
        const t = ev.touches[0];
        if (!t) return;
        const now = performance.now();
        const dt = now - lastTimeRef.current;
        const dy = t.clientY - lastYRef.current;
        if (dt > 0) {
          velocityRef.current = (dy / dt) * 1000;
        }
        lastYRef.current = t.clientY;
        lastTimeRef.current = now;
        const delta = t.clientY - startYRef.current;
        setDragY(computeDragY(delta));
      };

      const handleEnd = (ev: TouchEvent) => {
        window.removeEventListener("touchmove", handleMove);
        window.removeEventListener("touchend", handleEnd);
        window.removeEventListener("touchcancel", handleEnd);
        const t = ev.changedTouches[0];
        const finalDelta = t ? t.clientY - startYRef.current : 0;
        finishDrag(Math.max(0, finalDelta));
      };

      window.addEventListener("touchmove", handleMove, { passive: true });
      window.addEventListener("touchend", handleEnd);
      window.addEventListener("touchcancel", handleEnd);
    },
    [computeDragY, finishDrag, isReducedMotion],
  );

  return {
    dragY,
    isDragging,
    isReducedMotion,
    handleProps: {
      onMouseDown,
      onTouchStart,
      style: { cursor: isReducedMotion ? "default" : "grab", touchAction: "none" },
    },
  };
}
