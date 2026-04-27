"use client";

/**
 * CopilotInput.tsx — Textarea + send button + voice mic for the copilot panel.
 * Reuses useVoiceCapture for voice input (same hook as CaptureSheet).
 */

import { useCallback, useEffect, useRef } from "react";
import { useVoiceCapture } from "../useVoiceCapture";

interface CopilotInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function CopilotInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: CopilotInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voice = useVoiceCapture();

  // Sync voice transcript into input
  useEffect(() => {
    if (voice.transcript) {
      onChange(voice.transcript);
    }
  }, [voice.transcript, onChange]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineH = 22;
    const minH = lineH * 2;
    const maxH = lineH * 6;
    el.style.height = `${Math.min(maxH, Math.max(minH, el.scrollHeight))}px`;
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!disabled && value.trim()) onSubmit();
      }
    },
    [disabled, value, onSubmit],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      voice.setTranscript(e.target.value);
    },
    [onChange, voice],
  );

  const handleSend = useCallback(() => {
    if (!disabled && value.trim()) onSubmit();
  }, [disabled, value, onSubmit]);

  const isEmpty = !value.trim();

  return (
    <div className="cp-input-wrap">
      <textarea
        ref={textareaRef}
        className="cp-textarea"
        placeholder="Ask anything about your day…  ⌘↩ to send"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={2}
        disabled={disabled}
        aria-label="Message to co-pilot"
      />
      <div className="cp-input-actions">
        {voice.supported && (
          <button
            type="button"
            className={`cp-mic-btn${voice.listening ? " listening" : ""}`}
            onClick={voice.toggle}
            aria-label={voice.listening ? "Stop voice input" : "Start voice input"}
            disabled={disabled}
          >
            🎙
          </button>
        )}
        <button
          type="button"
          className="cp-send-btn"
          onClick={handleSend}
          disabled={disabled || isEmpty}
          aria-label="Send message"
        >
          {disabled ? "…" : "↑"}
        </button>
      </div>
      {voice.interim && (
        <span className="cp-interim" aria-live="polite">{voice.interim}</span>
      )}
    </div>
  );
}
