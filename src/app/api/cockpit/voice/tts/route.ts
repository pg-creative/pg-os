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
  try {
    const body = await req.json();
    text = (body.text ?? "").toString().slice(0, 4000);
    voiceId = body.voiceId;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!text.trim())
    return NextResponse.json({ error: "empty_text" }, { status: 400 });

  const tried: string[] = [];

  // --- ElevenLabs Flash v2.5 (the real Marvis voice; needs Creator plan) ---
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (elevenKey && vid) {
    try {
      const r = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${vid}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_flash_v2_5",
            voice_settings: { stability: 0.4, similarity_boost: 0.8 },
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
