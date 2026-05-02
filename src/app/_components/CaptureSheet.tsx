"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useVoiceCapture } from "./useVoiceCapture";
import { useMode } from "./ModeProvider";
import { useIsCloud } from "./useIsCloud";
import { useSound } from "./SoundProvider";
import { MODE_CONFIG } from "../../lib/modes";

type Destination = "ship" | "queue" | "essay" | "linkedin" | "yuriko" | "hc-journal" | "todo";

interface CaptureSheetProps {
  onClose: () => void;
}

interface DestConfig {
  id: Destination;
  label: string;
  icon: string;
  hint: string;
  showTitle: boolean;
  showContext: boolean;
}

const DESTINATIONS: DestConfig[] = [
  { id: "ship",       label: "Ship",       icon: "🪶", hint: "Adds to ship log",        showTitle: false, showContext: true  },
  { id: "queue",      label: "Queue",      icon: "🧭", hint: "Drops into queue",         showTitle: false, showContext: true  },
  { id: "todo",       label: "Todo",       icon: "☑",  hint: "Creates a task",          showTitle: false, showContext: true  },
  { id: "hc-journal", label: "HC Journal", icon: "📖", hint: "Writes to Hero's journal", showTitle: false, showContext: false },
  { id: "essay",      label: "Essay",      icon: "✍",  hint: "Starts an essay draft",   showTitle: true,  showContext: false },
  { id: "linkedin",   label: "LinkedIn",   icon: "💼", hint: "Drafts a LinkedIn post",   showTitle: true,  showContext: false },
  { id: "yuriko",     label: "Yuriko",     icon: "🌙", hint: "Sends to Yuriko",         showTitle: true,  showContext: false },
];

const CONTEXT_OPTIONS = [
  { value: "",                label: "(none)" },
  { value: "metrasens",       label: "Metrasens" },
  { value: "heros-chronicle", label: "Hero's Chronicle" },
  { value: "pg-creative",     label: "PG Creative" },
  { value: "voyager",         label: "Voyager" },
  { value: "personal-os",     label: "Personal OS" },
  { value: "career-ops",      label: "Career Ops" },
];

interface StatusMsg {
  text: string;
  type: "success" | "error";
}

// Destinations that write to the local laptop filesystem and aren't usable
// from cloud (Vercel) deployments. The capture sheet hides these in cloud mode.
const LAPTOP_ONLY_DESTINATIONS: Destination[] = ["essay"];

export function CaptureSheet({ onClose }: CaptureSheetProps) {
  const { brand } = useMode();
  const isCloud = useIsCloud();
  const visibleDestinations = isCloud
    ? DESTINATIONS.filter((d) => !LAPTOP_ONLY_DESTINATIONS.includes(d.id))
    : DESTINATIONS;

  // Default destination driven by brand mode; user can override freely
  const brandDefaultDest: Destination | null = brand
    ? (MODE_CONFIG[brand].captureDefault as Destination)
    : null;

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [sending, setSending] = useState<Destination | null>(null);
  const [status, setStatus] = useState<StatusMsg | null>(null);
  const [hoveredDest, setHoveredDest] = useState<Destination | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const voice = useVoiceCapture();
  const { play } = useSound();

  // Sync voice transcript into textarea
  useEffect(() => {
    if (voice.transcript) {
      setText(voice.transcript);
    }
  }, [voice.transcript]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineH = 24;
    const minH = lineH * 4;
    const maxH = lineH * 10;
    el.style.height = Math.min(Math.max(el.scrollHeight, minH), maxH) + "px";
    el.style.overflowY = el.scrollHeight > maxH ? "auto" : "hidden";
  }, [text]);

  // Focus textarea on mount + remember previously focused element to return to
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    returnFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    textareaRef.current?.focus();
    return () => {
      returnFocusRef.current?.focus?.();
    };
  }, []);

  // Escape closes; Tab is trapped inside the sheet
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (voice.listening) voice.stop();
        else onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = sheetRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, voice]);

  const showStatus = useCallback((msg: StatusMsg) => {
    setStatus(msg);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), 3000);
  }, []);

  const handleSend = useCallback(async (dest: DestConfig) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(dest.id);
    try {
      const body: Record<string, string> = {
        destination: dest.id,
        text: trimmed,
      };
      if (dest.showTitle && title.trim()) body.title = title.trim();
      if (dest.showContext && context) body.source = context;

      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        play(dest.id === "ship" ? "ship" : "capture");
        showStatus({ text: `✓ ${data.detail ?? `Sent to ${dest.label}`}`, type: "success" });
        setText("");
        setTitle("");
        setContext("");
        voice.reset();
      } else {
        showStatus({ text: `⚠ ${data.error ?? "Send failed"}`, type: "error" });
      }
    } catch (err) {
      showStatus({ text: `⚠ Network error — try again`, type: "error" });
    } finally {
      setSending(null);
    }
  }, [text, title, context, sending, voice, showStatus, play]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    voice.setTranscript(e.target.value);
  }, [voice]);

  const trimmed = text.trim();
  const isEmpty = !trimmed;

  // Determine which destinations need title/context based on hover or any active dest
  const activeDest = hoveredDest ? DESTINATIONS.find(d => d.id === hoveredDest) : null;
  const showTitleInput = activeDest?.showTitle ?? DESTINATIONS.some(d => d.showTitle);
  const showContextInput = activeDest?.showContext ?? DESTINATIONS.some(d => d.showContext);

  const micError = voice.error === "not-allowed" || voice.error === "service-not-allowed";

  return (
    <div className="cap-backdrop" onClick={onClose} role="dialog" aria-modal aria-label="Capture">
      <div
        className="cap-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="cap-header">
          <span className="cap-title" id="capture-sheet-title">CAPTURE</span>
          <button className="cap-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="cap-textarea"
          placeholder="Speak or type what's on your mind…"
          value={text}
          onChange={handleTextChange}
          rows={4}
        />

        {/* Voice row */}
        {voice.supported && (
          <div className="cap-voice-row">
            <button
              className={`cap-mic${voice.listening ? " listening" : ""}`}
              onClick={voice.toggle}
              aria-label={voice.listening ? "Stop listening" : "Start listening"}
              type="button"
            >
              🎙 {voice.listening ? "Listening · tap to stop" : "Listen"}
            </button>
            {voice.interim && (
              <span className="cap-interim">{voice.interim}</span>
            )}
            {micError && (
              <span className="cap-interim cap-mic-hint">Allow mic in your browser to use voice</span>
            )}
          </div>
        )}

        {/* Metadata row — always show both fields so layout doesn't jump */}
        <div className="cap-meta-row">
          <input
            className="cap-title-input"
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Title"
          />
          <select
            className="cap-context-select"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            aria-label="Context"
          >
            {CONTEXT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Destination grid */}
        <div className="cap-dest-grid">
          {visibleDestinations.map((dest) => {
            const isSending = sending === dest.id;
            const isDisabled = isEmpty || !!sending;
            const isBrandDefault = brandDefaultDest === dest.id;
            return (
              <button
                key={dest.id}
                className={`cap-dest-btn${isSending ? " sending" : ""}${isBrandDefault ? " cm-brand-default" : ""}`}
                onClick={() => handleSend(dest)}
                onMouseEnter={() => setHoveredDest(dest.id)}
                onMouseLeave={() => setHoveredDest(null)}
                disabled={isDisabled}
                aria-label={`Send to ${dest.label}${isBrandDefault ? " (brand mode default)" : ""}`}
                type="button"
              >
                <span className="cap-dest-icon">{isSending ? "…" : dest.icon}</span>
                <span className="cap-dest-label">{isSending ? "sending…" : dest.label}</span>
                <span className="cap-dest-hint">{isBrandDefault ? "★ mode default" : dest.hint}</span>
              </button>
            );
          })}
        </div>

        {/* Status */}
        {status && (
          <div className={`cap-status${status.type === "error" ? " error" : " success"}`}>
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
