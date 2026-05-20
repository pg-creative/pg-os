import { NextResponse } from "next/server";
import { detectVoiceCapabilities } from "@/lib/cockpit/voice/providers";

export const dynamic = "force-dynamic";

// Tells the client which voice providers are available (by which keys exist).
// Secret keys (ElevenLabs/Deepgram/OpenAI) are NOT returned — only the
// in-browser Picovoice access key + the chosen ElevenLabs voice id.
export async function GET() {
  return NextResponse.json(detectVoiceCapabilities());
}
