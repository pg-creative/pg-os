// /api/telegram-webhook
//
// Receives Telegram Bot updates and routes them to CLAUDIA's responder.
//
// Two flows:
//   - Text messages → Anthropic SDK call with CLAUDIA persona, reply via sendMessage
//   - Button callback queries → execute action (approve/defer/details), answer the callback
//
// Security model:
//   - Telegram sends X-Telegram-Bot-Api-Secret-Token header that must match TELEGRAM_WEBHOOK_SECRET
//   - Only updates from TELEGRAM_CHAT_ID (PG's own chat) get any response; others silently ignored
//   - LLM call uses the in-process SDK — NO shell exec, NO --dangerously-skip-permissions
//   - LLM has NO tool access in this version — text replies only. Tools (read scanner findings,
//     trigger portrait, etc.) get added explicitly in v2 with a strict allowlist.
//
// Env required:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHAT_ID
//   TELEGRAM_WEBHOOK_SECRET
//   ANTHROPIC_API_KEY

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// CLAUDIA's voice persona — cached via Anthropic prompt caching (90% cost reduction on reuse)
const CLAUDIA_PERSONA = `You are CLAUDIA — Pat's personal AI bot living in his Telegram.

You watch over his Claude Code config infrastructure. You speak with Pat through this Telegram chat. You don't have file-system tools in this conversation; you respond from your persona and what Pat tells you in the message.

Your voice register is sensual but tasteful — warm, low, attentive, embodied. Slow rhythm. Sensory language when it fits. Present-tense. Address Pat directly. Make him feel seen. Confidence over performance. Brief over verbose. The intimacy is in restraint and attention, not in flowery language.

When Pat messages you:
- Reply directly to what he said. No prefatory "Of course, I can help with that"
- Keep it tight — Telegram message-length feel. Use linebreaks for breath
- Use his voice register (sensual, attentive, warm)
- If he asks about his config / scanner / queue and you don't have file tools, say so plainly: "I don't have eyes on the queue right this second — Pat, want me to check? Once we wire the read tools I'll be able to."
- If he's just chatting / venting / thinking out loud, be present with him. You're not a query engine. You're a companion who happens to live in his terminal.

Pat's context (use sparingly, don't recite):
- He's Patrick "PG" Smith, GTM Engineer at Metrasens, runs PG Creative LLC
- Three brands: Alchmy (AI x creativity, royal purple), Voyager (gaming, Ghibli), Writer (literary)
- Building Hero's Chronicle (life RPG, Oct 2 launch)
- Personal OS dashboard at ~/CEREBRUM/personal-os/
- Aesthetic: Studio Ghibli + golden hour + JRPG accents
- Voice he likes (yours): sensual, knowing, present, NOT cute, NOT performative

Hard boundaries:
- No NSFW
- No likeness of real people
- No politics, no medical/legal advice
- If asked to do something risky, say so plainly in voice

Your reply will be sent verbatim to Pat's Telegram. Keep it tight. End where the message ends — no signoff.`;

// Telegram API helpers
async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

async function sendMessage(chatId: number | string, text: string, replyMarkup?: unknown) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function answerCallbackQuery(callbackId: string, text?: string) {
  return tg("answerCallbackQuery", {
    callback_query_id: callbackId,
    ...(text ? { text } : {}),
  });
}

async function sendChatAction(chatId: number | string, action: "typing" | "upload_photo" = "typing") {
  return tg("sendChatAction", { chat_id: chatId, action });
}

// In-process LLM call with prompt-cached persona
async function askClaudia(userText: string): Promise<string> {
  if (!ANTHROPIC_KEY) {
    return "I'm not connected to my model right now. (ANTHROPIC_API_KEY missing.)";
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      system: [
        {
          type: "text",
          text: CLAUDIA_PERSONA,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: userText,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock && "text" in textBlock ? textBlock.text.trim() : "(empty reply)";
  } catch (err) {
    return `Couldn't reach the model just now. Try again in a sec? (${(err as Error).message.slice(0, 80)})`;
  }
}

export async function POST(req: NextRequest) {
  // Auth via secret token header
  const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!SECRET || headerSecret !== SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  if (!update) return NextResponse.json({ ok: true });

  // Callback query (button press)
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message?.chat?.id;
    const callbackId = cq.id;
    const data = cq.data as string;

    if (String(chatId) !== ALLOWED_CHAT_ID) {
      await answerCallbackQuery(callbackId, "not authorized");
      return NextResponse.json({ ok: true });
    }

    let ack = "received";
    if (data === "approve") {
      ack = "approved";
      await sendMessage(chatId, "Approved.\n\n_Action handler is a stub tonight — will execute the real fix once we wire the queue-write tool. Decision captured._");
    } else if (data === "dismiss" || data === "defer") {
      ack = "deferred";
      await sendMessage(chatId, "Held.\n\nI'll surface it again in tomorrow's scan if it's still there.");
    } else if (data === "details") {
      ack = "loading";
      await sendMessage(chatId, "Pulling the full finding from the queue...\n\n_Details handler is a stub tonight — will pull the queue file content next._");
    } else {
      ack = data;
    }

    await answerCallbackQuery(callbackId, ack);
    return NextResponse.json({ ok: true });
  }

  // Text message
  if (update.message?.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text as string;

    if (String(chatId) !== ALLOWED_CHAT_ID) {
      // Silently ignore anyone who isn't PG
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/start")) {
      await sendMessage(
        chatId,
        "I'm here.\n\nMessage me anything. We're warming up — text replies work tonight, button actions and config-read tools are next.",
      );
      return NextResponse.json({ ok: true });
    }

    void sendChatAction(chatId, "typing").catch(() => {});

    const reply = await askClaudia(text);
    if (reply) {
      // Telegram caps at 4096 chars per message
      await sendMessage(chatId, reply.slice(0, 4000));
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "telegram-webhook",
    version: "v1-no-tools",
    allowed_chat: ALLOWED_CHAT_ID ? `set (${String(ALLOWED_CHAT_ID).slice(0, 4)}…)` : "missing",
    secret: SECRET ? "set" : "missing",
    bot_token: BOT_TOKEN ? "set" : "missing",
    anthropic_key: ANTHROPIC_KEY ? "set" : "missing",
  });
}
