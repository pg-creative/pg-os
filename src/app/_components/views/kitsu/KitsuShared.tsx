"use client";

/**
 * KitsuShared — primitives reused across the 4 Kitsu tab variants
 * (Shrine / Mission / Notebook / CardDeck). Extracted so each variant
 * stays small and focused on its layout idea.
 *
 * - useSoul()    : fetch + write the soul stack (/api/kitsu/soul)
 * - useVoiceCfg(): fetch voice config (/api/cockpit/voice/config)
 * - Bubble      : the chat bubble (matches MarvisCorner's visual language)
 * - TypingBubble: 3-dot foxfire indicator while Kitsu is thinking
 * - ChatComposer: input + send / teach / wake / mic row
 */

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import type { useMarvis } from "../cockpit/useMarvis";

// ── Palette (matches MarvisCorner so the family reads as one design) ──────────
export const KITSU_C = {
  ink: "#13110D",
  panel: "rgba(20,17,13,0.97)",
  cream: "#EFE6D4",
  dim: "#9C8B70",
  amber: "#D6A367",
  amberBright: "#FBE8C8",
  emerald: "#7C9A6E",
  ruby: "#B8536F",
  indigo: "#2A3554",
  foxfireMid: "rgba(214,163,103,0.18)",
  foxfireStrong: "rgba(214,163,103,0.55)",
} as const;

// ── Soul stack (IDENTITY / SOUL / USER / MEMORY / decision-log) ──────────────
export type SoulKey = "IDENTITY" | "SOUL" | "USER" | "MEMORY" | "decision-log";
export type SoulFiles = Record<SoulKey, string>;

export interface UseSoul {
  files: SoulFiles | null;
  loading: boolean;
  refresh: () => Promise<void>;
  save: (k: SoulKey, content: string) => Promise<boolean>;
}

export function useSoul(): UseSoul {
  const [files, setFiles] = useState<SoulFiles | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/kitsu/soul", { cache: "no-store" });
      if (r.ok) {
        const data = (await r.json()) as { files: SoulFiles };
        setFiles(data.files);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (k: SoulKey, content: string) => {
      try {
        const r = await fetch("/api/kitsu/soul", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ file: k, content }),
        });
        if (r.ok) {
          setFiles((cur) => (cur ? { ...cur, [k]: content } : cur));
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [],
  );

  return { files, loading, refresh, save };
}

// ── Voice config (read-only display, for the Mission Control variant) ────────
export interface VoiceCfg {
  stt: string;
  tts: string;
  wake: string;
  elevenVoiceId: string | null;
  picovoiceAccessKey: string | null;
  premium: boolean;
}

export function useVoiceCfg(): VoiceCfg | null {
  const [cfg, setCfg] = useState<VoiceCfg | null>(null);
  useEffect(() => {
    fetch("/api/cockpit/voice/config", { cache: "no-store" })
      .then((r) => r.json())
      .then(setCfg)
      .catch(() => setCfg(null));
  }, []);
  return cfg;
}

// ── Bubble: a single message in the transcript ───────────────────────────────
export function Bubble({
  role,
  text,
  live,
  size = "md",
}: {
  role: "user" | "assistant";
  text: string;
  live?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const me = role === "user";
  const fontSize =
    size === "lg" ? "var(--text-md)" : size === "sm" ? "var(--text-xs)" : "var(--text-sm)";
  const padding = size === "lg" ? "11px 15px" : "8px 11px";
  return (
    <div
      style={{
        alignSelf: me ? "flex-end" : "flex-start",
        maxWidth: size === "lg" ? "82%" : "88%",
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        flexDirection: me ? "row-reverse" : "row",
      }}
    >
      {!me && (
        <span
          aria-hidden
          style={{
            fontSize: size === "lg" ? 22 : 16,
            lineHeight: 1,
            flexShrink: 0,
            filter: "drop-shadow(0 0 6px rgba(214,163,103,.4))",
          }}
        >
          🦊
        </span>
      )}
      <div
        style={{
          background: me ? "rgba(255,248,231,.10)" : "rgba(214,163,103,.20)",
          border: `1px solid ${me ? "rgba(255,248,231,.22)" : "rgba(214,163,103,.4)"}`,
          borderRadius: 12,
          padding,
          color: KITSU_C.cream,
          fontSize,
          lineHeight: 1.45,
          opacity: live ? 0.85 : 1,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          boxShadow: me ? "none" : "0 0 14px rgba(214,163,103,.22)",
        }}
      >
        {text}
      </div>
    </div>
  );
}

/** Three pulsing foxfire dots: shown while Kitsu is thinking. */
export function TypingBubble() {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>
        🦊
      </span>
      <div
        aria-label="Kitsu is thinking"
        style={{
          background: "rgba(214,163,103,.20)",
          border: "1px solid rgba(214,163,103,.4)",
          borderRadius: 12,
          padding: "10px 13px",
          display: "flex",
          gap: 5,
          alignItems: "center",
          boxShadow: "0 0 14px rgba(214,163,103,.22)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: KITSU_C.amber,
              animation: `kitsuDot 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes kitsuDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.45; }
          40%           { transform: scale(1);   opacity: 1;    }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes kitsuDot {
            0%, 100% { transform: scale(0.85); opacity: 0.7; }
          }
        }
      `}</style>
    </div>
  );
}

// ── ChatComposer: input row (send / teach / wake / mic) ──────────────────────
function btn(color: string, on: boolean): CSSProperties {
  return {
    flexShrink: 0,
    background: on ? "rgba(214,163,103,.2)" : "transparent",
    border: `1px solid ${color}`,
    color,
    borderRadius: 8,
    padding: "9px 11px",
    minWidth: 44,
    minHeight: 44,
    cursor: "pointer",
    fontSize: "var(--text-base)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

export function ChatComposer({
  marvis,
  placeholder = "message Kitsu…",
}: {
  marvis: ReturnType<typeof useMarvis>;
  placeholder?: string;
}) {
  const [typed, setTyped] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = typed.trim();
        if (v) {
          marvis.ask(v);
          setTyped("");
        }
      }}
      style={{
        display: "flex",
        gap: 6,
        padding: "10px 12px",
        borderTop: "1px solid rgba(214,163,103,.16)",
        background: "rgba(20,17,13,0.55)",
      }}
    >
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          flex: 1,
          minWidth: 0,
          background: KITSU_C.ink,
          border: "1px solid rgba(214,163,103,.25)",
          borderRadius: 8,
          padding: "9px 11px",
          color: KITSU_C.cream,
          fontSize: "var(--text-sm)",
        }}
      />
      <button type="submit" title="send" style={btn(KITSU_C.amber, false)}>
        ➤
      </button>
      <button
        type="button"
        onClick={() => marvis.toggleWake(!marvis.wakeArmed)}
        title="Hands-free 'Hey Kitsu'"
        style={btn(marvis.wakeArmed ? KITSU_C.emerald : KITSU_C.dim, marvis.wakeArmed)}
      >
        👂
      </button>
      <button
        type="button"
        onMouseDown={marvis.startListening}
        onMouseUp={marvis.stopListening}
        onTouchStart={marvis.startListening}
        onTouchEnd={marvis.stopListening}
        title="Hold to talk"
        style={btn(KITSU_C.amber, marvis.state === "listening")}
      >
        🎙
      </button>
    </form>
  );
}

// ── Transcript: scrollable list of bubbles + live reply + typing indicator ───
export function Transcript({
  marvis,
  bubbleSize = "md",
  emptyHint = "Ask me what's happening with the fleet.",
}: {
  marvis: ReturnType<typeof useMarvis>;
  bubbleSize?: "sm" | "md" | "lg";
  emptyHint?: string;
}) {
  // Auto-scroll on new content
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
  }, [scrollEl, marvis.turns, marvis.reply, marvis.transcript, marvis.state]);

  return (
    <div
      ref={setScrollEl}
      style={{
        flex: 1,
        minHeight: 80,
        overflowY: "auto",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {marvis.turns.length === 0 && marvis.state === "idle" && (
        <div
          style={{
            color: KITSU_C.dim,
            fontSize: "var(--text-sm)",
            fontStyle: "italic",
            textAlign: "center",
            padding: "16px 6px",
          }}
        >
          {emptyHint}
        </div>
      )}
      {marvis.turns.map((t, i) => (
        <Bubble key={i} role={t.role} text={t.text} size={bubbleSize} />
      ))}
      {(marvis.state === "thinking" || marvis.state === "speaking") &&
        marvis.reply && (
          <Bubble
            role="assistant"
            text={marvis.reply}
            size={bubbleSize}
            live
          />
        )}
      {marvis.state === "thinking" && !marvis.reply && <TypingBubble />}
      {marvis.state === "thinking" && marvis.activeTool && (
        <div
          style={{
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: 7,
            color: KITSU_C.amber,
            fontFamily: "ui-monospace,monospace",
            fontSize: "var(--text-2xs)",
            letterSpacing: ".04em",
            opacity: 0.85,
          }}
        >
          <span aria-hidden>◇</span>
          checking {marvis.activeTool}…
        </div>
      )}
      {marvis.state === "listening" && (
        <Bubble
          role="user"
          text={marvis.transcript || "listening…"}
          size={bubbleSize}
          live
        />
      )}
    </div>
  );
}

// ── StatePill: tiny status indicator shared by all variants ──────────────────
export function StatePill({ state }: { state: string }) {
  const color =
    state === "speaking"
      ? KITSU_C.amber
      : state === "listening"
        ? KITSU_C.emerald
        : state === "thinking"
          ? KITSU_C.amberBright
          : KITSU_C.dim;
  return (
    <span
      style={{
        fontFamily: "ui-monospace,monospace",
        fontSize: "var(--text-2xs)",
        letterSpacing: ".18em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: "2px 8px",
        opacity: 0.9,
      }}
    >
      {state}
    </span>
  );
}
