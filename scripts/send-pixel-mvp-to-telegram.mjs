#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Blob } from "node:buffer";

const env = Object.fromEntries(
  readFileSync("/Users/pg/CEREBRUM/personal-os/.env.local", "utf-8")
    .split("\n").filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g, "")]; }),
);
const TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHAT = env.TELEGRAM_CHAT_ID;
const API = m => `https://api.telegram.org/bot${TOKEN}/${m}`;

async function send(text) {
  await fetch(API("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT, text, parse_mode: "Markdown", disable_web_page_preview: true }),
  });
}

const MSG = [
  "*MVP both lanes — your move (3 min)*",
  "",
  "I have MJ wayfarer painting live. Need API key for the pixel lane.",
  "",
  "*Pick ONE (ranked best-fit for your stack):*",
  "",
  "🥇 *Replicate + Retro Diffusion* — recommended",
  "  https://replicate.com/account/api-tokens",
  "  • Sign up w/ GitHub (one click)",
  "  • Free $0.05 credit = ~50 pixel sprites",
  "  • Then ~$0.001–0.003 per sprite",
  "  • Paste token here when ready",
  "",
  "🥈 *PixelLab.ai* — purpose-built for game sprites",
  "  https://www.pixellab.ai/pixellab-api",
  "  • Sign up, grab API key",
  "  • $12–50/mo subscription",
  "  • Best for walk cycles + 8-directional",
  "",
  "🥉 *Skip both — I draw pixel placeholders in CSS*",
  "  • Ugly but instant, no signup",
  "  • Only use if you don't want to sign up tonight",
  "",
  "*What I'll do with the key:*",
  "1. Generate 4 pixel wayfarer candidates (warm amber palette per Eastward / Sea of Stars references)",
  "2. Drop them into the lab's HD-2D Sprite variant slot",
  "3. Lab now shows MJ painted vs pixel sprite side-by-side in Character section",
  "4. You pick which lane wins (or hybrid)",
  "",
  "*Reply with:*",
  "• `replicate <token>` → I rip Retro Diffusion now",
  "• `pixellab <key>` → I rip PixelLab now",
  "• `css` → skip API, ugly placeholders",
  "• Any wayfarer pick (0-3) + bard pick (0-3) is still pending from earlier",
].join("\n");

await send(MSG);
console.log("done");
