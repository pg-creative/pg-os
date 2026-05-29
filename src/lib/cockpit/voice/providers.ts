// Voice provider capability detection.
//
// The cockpit voice stack degrades gracefully by which API keys are present in
// the environment. Client asks /api/cockpit/voice/config, gets back what's
// available, and wires the best provider it can. The instant PG adds keys to
// .env.local, the capability flips with zero code change.
//
// Tiers (per research/living-avatars-voice-stack-2026-05-19.md):
//   STT:  Deepgram (key) → Web Speech (browser, free)
//   TTS:  ElevenLabs (key, characterful) → OpenAI (key) → Web Speech (browser, robotic)
//   wake: Picovoice (key, "Hey Marvis") → push-to-talk hotkey

export type SttProvider = "deepgram" | "webspeech";
export type TtsProvider = "elevenlabs" | "openai" | "webspeech";
export type WakeProvider = "picovoice" | "pushToTalk";

export interface VoiceCapabilities {
  stt: SttProvider;
  tts: TtsProvider;
  wake: WakeProvider;
  elevenVoiceId: string | null;
  picovoiceAccessKey: string | null; // safe to expose: Picovoice runs in-browser, needs the key client-side
  // True once a genuinely characterful path exists end-to-end.
  premium: boolean;
}

export function detectVoiceCapabilities(): VoiceCapabilities {
  const hasEleven = !!process.env.ELEVENLABS_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasDeepgram = !!process.env.DEEPGRAM_API_KEY;
  const hasPicovoice = !!process.env.PICOVOICE_ACCESS_KEY;

  const tts: TtsProvider = hasEleven
    ? "elevenlabs"
    : hasOpenAI
      ? "openai"
      : "webspeech";
  const stt: SttProvider = hasDeepgram ? "deepgram" : "webspeech";
  const wake: WakeProvider = hasPicovoice ? "picovoice" : "pushToTalk";

  return {
    stt,
    tts,
    wake,
    elevenVoiceId: process.env.ELEVENLABS_VOICE_ID || null,
    // Picovoice Porcupine runs as in-browser WASM, so its access key is meant
    // to be used client-side. The TTS/STT secret keys NEVER leave the server.
    picovoiceAccessKey: hasPicovoice
      ? (process.env.PICOVOICE_ACCESS_KEY as string)
      : null,
    premium: hasEleven && hasDeepgram,
  };
}
