"use client";
/**
 * AmbientIdle — T-08
 *
 * After 90s of zero pointer/key activity, sets data-idle="true" on body,
 * dims the app via a CSS filter (handled in globals.css under the
 * "T-08 Ambient Idle" section), and surfaces a single Ghibli-style serif quote
 * at center-bottom that rotates every 12s.
 *
 * Any input → instant exit. Tab switches count as activity.
 *
 * Coordination with T-09 NowProvider: if `data-now="true"` is present on
 * <body>, idle does not activate. NowProvider's overlay owns the focus state.
 */

import { useEffect, useState } from "react";
import { ambientQuotes, pickQuote } from "@/lib/ambientQuotes";
import { useIdleDetector } from "./useIdleDetector";
import { useNowMode } from "./useNowMode";

const ROTATE_MS = 12_000;
const FADE_MS = 800;

export function AmbientIdle() {
  const { isNow } = useNowMode();
  const idle = useIdleDetector({ timeoutMs: 90_000, enabled: !isNow });
  const [quoteIdx, setQuoteIdx] = useState(() =>
    Math.floor(Math.random() * ambientQuotes.length),
  );
  const [visible, setVisible] = useState(false);

  // Reflect idle state to <body data-idle> so CSS can dim the app.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (idle && !isNow) {
      document.body.setAttribute("data-idle", "true");
    } else {
      document.body.removeAttribute("data-idle");
    }
    return () => {
      document.body.removeAttribute("data-idle");
    };
  }, [idle, isNow]);

  // Quote rotator: while idle, fade-in for FADE_MS, hold, fade-out for FADE_MS,
  // then advance. Total cadence = ROTATE_MS per quote.
  useEffect(() => {
    if (!idle || isNow) {
      setVisible(false);
      return;
    }

    // First quote: pick a fresh starting index, fade in.
    setQuoteIdx((i) => (i + 1) % ambientQuotes.length);
    const inTimer = setTimeout(() => setVisible(true), 30);

    const interval = setInterval(() => {
      // Fade out
      setVisible(false);
      // After fade-out, swap quote and fade back in
      setTimeout(() => {
        setQuoteIdx((i) => (i + 1) % ambientQuotes.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);

    return () => {
      clearTimeout(inTimer);
      clearInterval(interval);
      setVisible(false);
    };
  }, [idle, isNow]);

  if (!idle || isNow) return null;

  const quote = pickQuote(quoteIdx);

  return (
    <div
      className="ambient-idle-quote"
      data-visible={visible ? "true" : "false"}
      aria-hidden
    >
      <p className="ambient-idle-quote-body">{quote.body}</p>
      {quote.author && (
        <p className="ambient-idle-quote-author">
          <span className="ambient-idle-dash">—</span>
          {quote.author}
        </p>
      )}
    </div>
  );
}
