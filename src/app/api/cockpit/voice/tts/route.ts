import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Marvis's voice. Streams synthesized speech back to the browser.
// Tries each provider in order and FALLS THROUGH on failure, so a free-tier
// 402 / quota error on ElevenLabs silently degrades to OpenAI, then to the
// Web Speech signal — Marvis always has a voice.
//   ElevenLabs (characterful) → OpenAI (good) → 501 {fallback: webspeech}
// Secret keys stay server-side; only audio bytes cross to the client.
export async function POST(req: Request) {
  let text = "";
  let voiceId: string | undefined;
  let modelOverride: string | undefined;
  try {
    const body = await req.json();
    text = (body.text ?? "").toString().slice(0, 4000);
    voiceId = body.voiceId;
    modelOverride = body.model;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!text.trim())
    return NextResponse.json({ error: "empty_text" }, { status: 400 });

  const tried: string[] = [];

  // --- ElevenLabs (Kitsu's voice) ---
  // Turbo v2.5 chosen for sub-300ms TTFB (vs multilingual_v2's 2-3s) so chat
  // feels conversational. Uses the explicit /stream endpoint with
  // optimize_streaming_latency=3 for the lowest perceived first-byte time.
  // Voice settings tuned 2026-05-23 (WS-C): lower stability + higher style
  // brings prosody variation; higher similarity keeps the timbre intact.
  // For longer narrations where quality > latency, callers can pass
  //   { model: "eleven_multilingual_v2" } in the request body to override.
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (elevenKey && vid) {
    try {
      const r = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream?output_format=mp3_44100_128&optimize_streaming_latency=3`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: modelOverride || "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.35,
              similarity_boost: 0.85,
              style: 0.4,
              use_speaker_boost: true,
            },
          }),
        },
      );
      if (r.ok && r.body) {
        return new Response(r.body, {
          headers: {
            "content-type": "audio/mpeg",
            "x-tts-provider": "elevenlabs",
          },
        });
      }
      // e.g. 402 paid_plan_required on free tier — fall through.
      tried.push(`elevenlabs:${r.status}`);
    } catch (e) {
      tried.push(`elevenlabs:err`);
    }
  }

  // --- OpenAI TTS fallback ---
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const r = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          authorization: `Bearer ${openaiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: "onyx",
          input: text,
        }),
      });
      if (r.ok && r.body) {
        return new Response(r.body, {
          headers: { "content-type": "audio/mpeg", "x-tts-provider": "openai" },
        });
      }
      tried.push(`openai:${r.status}`);
    } catch (e) {
      tried.push(`openai:err`);
    }
  }

  // --- No working server TTS: client uses browser Web Speech ---
  return NextResponse.json(
    { error: "no_tts_provider", fallback: "webspeech", tried },
    { status: 501 },
  );
}
