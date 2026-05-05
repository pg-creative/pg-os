"use client";

/**
 * Toast — global notification deck. Event-driven so any component can fire
 * a toast without prop-drilling or context plumbing:
 *
 *   window.dispatchEvent(new CustomEvent("pgos:toast", { detail: {
 *     kind: "success" | "info" | "warning" | "error",
 *     title: "Approved",
 *     body: "P1: Create morning-briefing.md",
 *     duration: 4000, // optional, default 4s
 *   } }));
 *
 * Or use the helper: showToast({ kind, title, body }).
 *
 * Mount <ToastDeck /> exactly once at the page root.
 */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ToastKind = "success" | "info" | "warning" | "error";

export interface ToastDetail {
  kind?: ToastKind;
  title: string;
  body?: string;
  duration?: number;
}

interface ToastItem extends ToastDetail {
  id: string;
}

const DEFAULT_DURATION = 4_000;

export function showToast(detail: ToastDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("pgos:toast", { detail }));
}

const KIND_GLYPH: Record<ToastKind, string> = {
  success: "✓",
  info: "·",
  warning: "!",
  error: "✕",
};

export function ToastDeck() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail || !detail.title) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = detail.duration ?? DEFAULT_DURATION;
      setItems((prev) => [...prev, { ...detail, id }]);
      window.setTimeout(() => dismiss(id), duration);
    };
    window.addEventListener("pgos:toast", handler);
    return () => window.removeEventListener("pgos:toast", handler);
  }, [dismiss]);

  if (typeof document === "undefined" || items.length === 0) return null;

  return createPortal(
    <div className="toast-deck" role="status" aria-live="polite" aria-atomic="false">
      {items.map((t) => {
        const kind = t.kind ?? "info";
        return (
          <div
            key={t.id}
            className={`toast toast-${kind}`}
            onClick={() => dismiss(t.id)}
            role="button"
            tabIndex={0}
            aria-label={`Dismiss: ${t.title}`}
          >
            <span className="toast-glyph" aria-hidden="true">{KIND_GLYPH[kind]}</span>
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              {t.body && <div className="toast-text">{t.body}</div>}
            </div>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
