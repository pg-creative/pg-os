"use client";

/**
 * useMarvis — the client voice loop for the cockpit orchestrator.
 *
 * Loop:  listen (STT) → think (Claude via /api/copilot/chat?mode=marvis)
 *        → speak (TTS) → idle.  Drives the MarvisPresence state machine.
 *
 * Graceful degradation (auto-upgrades as keys/plan come online, zero code change):
 *   STT : Web Speech now (free).  Deepgram = follow-up (needs mic-proxy WS).
 *   TTS : /api/cockpit/voice/tts → ElevenLabs (Creator plan) → OpenAI → 501,
 *         on 501 the browser speaks via Web Speech synthesis.
 *   wake: push-to-talk now.  Picovoice "Hey Marvis" = follow-up (needs SDK).
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type MarvisState = "idle" | "listening" | "thinking" | "speaking";

export interface MarvisConfig {
  stt: string;
  tts: string;
  wake: string;
  elevenVoiceId: string | null;
  picovoiceAccessKey: string | null;
  premium: boolean;
}

interface Turn {
  role: "user" | "assistant";
  text: string;
}

// Minimal Web Speech typings (vendor-prefixed, not in lib.dom for all targets).
type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function useMarvis() {
  const [state, setState] = useState<MarvisState>("idle");
  const [config, setConfig] = useState<MarvisConfig | null>(null);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const recRef = useRef<SpeechRec | null>(null);
  const wakeRef = useRef<SpeechRec | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [wakeArmed, setWakeArmed] = useState(false);
  const wakeArmedRef = useRef(false);
  const [party, setParty] = useState(false); // 🎉 "initialize party mode"

  useEffect(() => {
    fetch("/api/cockpit/voice/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  // ── Speak: stream audio from the TTS route, fall back to Web Speech ──
  // Resolves when the spoken line FINISHES (not when it starts) so callers can
  // sequence around it — e.g. party mode waits for the intro line to end before
  // starting the song, and ducks the music while a hype line plays.
  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        // Stop anything already speaking — prevents two overlapping voices.
        try {
          audioRef.current?.pause();
          audioRef.current = null;
        } catch {
          /* noop */
        }
        try {
          window.speechSynthesis?.cancel();
        } catch {
          /* noop */
        }
        setState("speaking");
        // single-shot guard so a line never resolves twice
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          setState("idle");
          resolve();
        };
        (async () => {
          try {
            const r = await fetch("/api/cockpit/voice/tts", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ text }),
            });
            if (r.ok && r.headers.get("content-type")?.includes("audio")) {
              const blob = await r.blob();
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audioRef.current = audio;
              audio.onended = () => {
                URL.revokeObjectURL(url);
                finish();
              };
              audio.onerror = finish;
              // play() can reject (autoplay policy) — resolve so we never hang.
              audio.play().catch(finish);
              return;
            }
          } catch {
            /* fall through to web speech */
          }
          // Web Speech fallback (free, robotic — placeholder until ElevenLabs)
          try {
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 1.05;
            u.onend = finish;
            u.onerror = finish;
            window.speechSynthesis.speak(u);
          } catch {
            finish();
          }
        })();
      }),
    [],
  );

  // ── Think: stream Marvis's reply from the shared Copilot agent ──
  const ask = useCallback(
    async (userText: string) => {
      if (!userText.trim()) return;
      // 🎉 easter egg: "initialize party mode"
      // PartyMode owns the audio choreography: it speaks the intro line, THEN
      // starts the song, then drops hype lines (ducking the music). So here we
      // only flip the flag + set the transcript bubble — no speak() collision.
      if (/initiali[sz]e party mode|party mode/i.test(userText)) {
        setParty(true);
        setReply("Initializing party mode. Hold onto something.");
        return;
      }
      setReply("");
      setState("thinking");
      const nextTurns: Turn[] = [...turns, { role: "user", text: userText }];
      setTurns(nextTurns);

      let acc = "";
      try {
        const r = await fetch("/api/copilot/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mode: "marvis",
            messages: nextTurns.map((t) => ({ role: t.role, content: t.text })),
          }),
        });
        if (!r.body) throw new Error("no stream");
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const events = buf.split("\n\n");
          buf = events.pop() ?? "";
          for (const ev of events) {
            const line = ev.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            try {
              const msg = JSON.parse(line.slice(6));
              if (msg.type === "text" && msg.delta) {
                acc += msg.delta;
                setReply(acc);
              }
            } catch {
              /* skip */
            }
          }
        }
      } catch {
        acc = acc || "I lost the thread there. Say again?";
      }
      setTurns((t) => [...t, { role: "assistant", text: acc }]);
      await speak(acc);
    },
    [turns, speak],
  );

  // ── Listen: Web Speech push-to-talk ──
  const startListening = useCallback(() => {
    const Ctor =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechRec;
          webkitSpeechRecognition?: new () => SpeechRec;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec })
        .webkitSpeechRecognition;
    if (!Ctor) {
      // No STT available — let the caller type instead.
      setState("idle");
      return false;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const t = last[0].transcript;
      setTranscript(t);
    };
    rec.onerror = () => setState("idle");
    rec.onend = () => {
      setTranscript((t) => {
        if (t.trim()) ask(t);
        else setState("idle");
        return "";
      });
    };
    recRef.current = rec;
    setTranscript("");
    setState("listening");
    rec.start();
    return true;
  }, [ask]);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const interrupt = useCallback(() => {
    try {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    } catch {
      /* noop */
    }
    setState("idle");
  }, []);

  // ── Interim "Hey Marvis" wake word via Web Speech continuous listen ──
  // (Free, no approval. Swap to Picovoice once config.picovoiceAccessKey lands.)
  const toggleWake = useCallback(
    (on: boolean) => {
      const Ctor =
        (
          window as unknown as {
            SpeechRecognition?: new () => SpeechRec;
            webkitSpeechRecognition?: new () => SpeechRec;
          }
        ).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec })
          .webkitSpeechRecognition;
      if (!Ctor) return false;

      if (!on) {
        wakeArmedRef.current = false;
        setWakeArmed(false);
        try {
          wakeRef.current?.stop();
        } catch {
          /* noop */
        }
        return true;
      }

      wakeArmedRef.current = true;
      setWakeArmed(true);
      const rec = new Ctor();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.continuous = true;
      rec.onresult = (e) => {
        const last = e.results[e.results.length - 1];
        const heard = last[0].transcript || "";
        // "Kitsu" — lenient, since Web Speech mishears short names
        // ("kit sue", "kitsune", "ketsu", "kitsu").
        const WAKE = /\b(kitsu|kitsune|kit\s?sue|ket\s?sue|ketsu|kitsu)\b/i;
        if (WAKE.test(heard)) {
          // Take whatever follows the wake word as the command.
          const cmd = heard
            .replace(new RegExp(`.*${WAKE.source}[,.!?\\s]*`, "i"), "")
            .trim();
          if (cmd) ask(cmd);
          else startListening(); // bare "Marvis" → open the mic for a command
        }
      };
      rec.onerror = () => {};
      rec.onend = () => {
        // Web Speech stops itself periodically — restart while armed.
        if (wakeArmedRef.current) {
          try {
            rec.start();
          } catch {
            /* already started */
          }
        }
      };
      wakeRef.current = rec;
      try {
        rec.start();
      } catch {
        /* noop */
      }
      return true;
    },
    [ask, startListening],
  );

  return {
    state,
    config,
    transcript,
    reply,
    turns,
    ask, // type-to-Marvis path (works with zero mic/keys)
    speak, // exposed so PartyMode can choreograph intro + hype lines
    startListening,
    stopListening,
    interrupt,
    toggleWake,
    wakeArmed,
    party,
    setParty,
  };
}
