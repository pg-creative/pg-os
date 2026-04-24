"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser Web Speech API wrapper.
 * Works on Safari + Chrome on Mac. No API key, no network round-trip — the
 * browser's built-in speech recognition (uses Siri-level / Google-level service
 * on device or via the OS's speech APIs).
 *
 * On Chrome desktop the service IS cloud-based (Google). On Safari iOS it's
 * on-device. We don't distinguish — either way PG doesn't manage credentials.
 */

type Recog = typeof window extends { SpeechRecognition: infer T } ? T : unknown;

interface SpeechRecognitionResultItem {
  readonly transcript: string;
}
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly 0: SpeechRecognitionResultItem;
}
interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognitionLike, ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
}

export function isVoiceSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as unknown as { SpeechRecognition?: Recog }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: Recog }).webkitSpeechRecognition
  );
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoiceCapture() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef(""); // accumulated final across this session

  const stop = useCallback(() => {
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* noop */ }
    }
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("speech_not_supported");
      return;
    }
    if (recRef.current) {
      try { recRef.current.abort(); } catch { /* noop */ }
    }
    finalRef.current = transcript;  // keep what user had typed/spoken so far
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let interimStr = "";
      let finalStr = finalRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = r[0].transcript;
        if (r.isFinal) finalStr = (finalStr ? finalStr + " " : "") + txt.trim();
        else interimStr += txt;
      }
      finalRef.current = finalStr;
      setTranscript(finalStr);
      setInterim(interimStr);
    };
    rec.onerror = (ev) => {
      const err = (ev as unknown as { error?: string }).error ?? "unknown";
      if (err !== "aborted" && err !== "no-speech") setError(err);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    try {
      rec.start();
      setListening(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "start_failed");
    }
    recRef.current = rec;
  }, [transcript]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  const reset = useCallback(() => {
    finalRef.current = "";
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  useEffect(() => () => {
    if (recRef.current) {
      try { recRef.current.abort(); } catch { /* noop */ }
    }
  }, []);

  return {
    listening,
    transcript,
    interim,
    error,
    supported: isVoiceSupported(),
    start,
    stop,
    toggle,
    reset,
    setTranscript,
  };
}
