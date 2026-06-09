/**
 * journalSentiment.ts — server-only AI helpers for the Morning Pages module.
 * Handwriting transcription and emotional sentiment analysis via Anthropic.
 *
 * Server-only — do NOT import from client components.
 */

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client)
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const MODEL = "claude-sonnet-4-6";

/**
 * Transcribe one or more handwritten morning-pages images using vision.
 * Returns the raw transcription text and the model used.
 */
export async function transcribeHandwriting(
  images: { mediaType: string; dataBase64: string }[],
): Promise<{ text: string; model: string }> {
  const client = getClient();
  if (!client) return { text: "", model: MODEL };

  const imageBlocks = images.map((img) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: img.mediaType as
        | "image/jpeg"
        | "image/png"
        | "image/gif"
        | "image/webp",
      data: img.dataBase64,
    },
  }));

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text" as const,
            text: "Transcribe the handwritten morning-pages text exactly as written. Preserve paragraph breaks. Use [?] for illegible words. Output ONLY the transcription — no preamble, no commentary, no formatting.",
          },
        ],
      },
    ],
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  return { text, model: MODEL };
}

export type SentimentResult = {
  score: number;
  mood: string;
  tags: string[];
  themes: string[];
  reflection: string;
};

const NEUTRAL_DEFAULT: SentimentResult = {
  score: 0,
  mood: "steady",
  tags: [],
  themes: [],
  reflection: "",
};

const SENTIMENT_SYSTEM = `Analyze the emotional content of the provided journal entry. Return STRICT JSON only — no prose, no code fences, no markdown. The JSON must have exactly these keys:
- score: number between -1.0 and 1.0 representing overall emotional valence (negative = distressed, 0 = neutral, positive = uplifted)
- mood: string, 1-3 word lowercase label (e.g. "quiet hope", "restless")
- tags: array of 3-6 short lowercase emotion or topic tags
- themes: array of 2-4 short recurring-theme phrases
- reflection: ONE warm, contemplative sentence written in second-person-elided voice. No clinical language. No exclamation marks. No hedging.`;

/**
 * Analyze the emotional valence and themes of a journal entry text.
 * Returns a safe neutral default on any failure or missing API key.
 */
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const client = getClient();
  if (!client) return { ...NEUTRAL_DEFAULT };

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SENTIMENT_SYSTEM,
      messages: [{ role: "user", content: text }],
    });

    const raw = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    // Strip code fences if present
    const stripped = raw
      .replace(/^```[^\n]*\n?/m, "")
      .replace(/```\s*$/m, "")
      .trim();

    const parsed = JSON.parse(stripped) as Partial<SentimentResult>;

    return {
      score:
        typeof parsed.score === "number"
          ? Math.max(-1, Math.min(1, parsed.score))
          : 0,
      mood: typeof parsed.mood === "string" ? parsed.mood : "steady",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      reflection:
        typeof parsed.reflection === "string" ? parsed.reflection : "",
    };
  } catch {
    return { ...NEUTRAL_DEFAULT };
  }
}
