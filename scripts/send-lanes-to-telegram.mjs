#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Blob } from "node:buffer";

const env = Object.fromEntries(
  readFileSync("/Users/pg/CEREBRUM/personal-os/.env.local", "utf-8")
    .split("\n").filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g, "")]; }),
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
async function album(items) {
  const fd = new FormData();
  fd.append("chat_id", CHAT);
  const media = items.map((it, i) => ({ type: "photo", media: `attach://p${i}`, ...(it.caption ? { caption: it.caption } : {}) }));
  fd.append("media", JSON.stringify(media));
  for (let i = 0; i < items.length; i++) {
    fd.append(`p${i}`, new Blob([readFileSync(it.path)], { type: "image/png" }), `p${i}.png`);
  }
  // captioned per-photo only works if individual sends, not albums — Telegram limits caption to first photo for groups.
  // Switching to individual sendPhoto so each has its own caption.
}
async function photo(filePath, caption) {
  const buf = readFileSync(filePath);
  const fd = new FormData();
  fd.append("chat_id", CHAT);
  fd.append("caption", caption);
  fd.append("parse_mode", "Markdown");
  fd.append("photo", new Blob([buf], { type: "image/png" }), filePath.split("/").pop());
  await fetch(API("sendPhoto"), { method: "POST", body: fd });
}

const STATUS = [
  "*Avatar generation lanes — visual examples*",
  "",
  "Four references. Each is a different *kind* of character system.",
  "",
  "1️⃣ *Rive cloud mascot* — 6 expression states, single character, state-machine driven",
  "2️⃣ *Rive hero animations gallery* — production examples (Duolingo etc)",
  "3️⃣ *PixelLab.ai* — true pixel sprite sheets, walk cycles, 4-8 directions",
  "4️⃣ *pixel-agents (reference)* — the OG Metro City office, for comparison",
  "",
  "*Reading them:*",
  "• Rive = lightweight (50-200KB), per-state animation, paint once + animate forever",
  "• PixelLab = pure pixel-art sprites (Octopath/Stardew vibe), great for walk cycles",
  "• MJ (current) = beautiful static painted portraits, no animation, no consistency between frames",
  "",
  "*The hybrid I'd recommend:* MJ for the *paint*, Rive for the *behavior*. We already have your wayfarer MJ; layering Rive on top gives him blinking + breathing + state shifts.",
].join("\n");

console.log("Sending status...");
await send(STATUS);

const shots = [
  ["/Users/pg/CEREBRUM/personal-os/scripts/ex-rive-mascot.png", "*1. Rive Cloud Mascot* — 6 expression states (idle/happy/sad/etc) controlled by a state machine. Tap-to-cycle in the live demo. Same character, different feelings, 50-200KB. This is what a state-machine character looks like in 2026."],
  ["/Users/pg/CEREBRUM/personal-os/scripts/ex-rive-hero.png", "*2. Rive Hero Animations* — gallery of production-deployed examples. Duolingo's owls, Hopin's mascots, etc. All driven by state machines."],
  ["/Users/pg/CEREBRUM/personal-os/scripts/ex-pixellab.png", "*3. PixelLab.ai* — true pixel-art sprite generator. Walk cycles, 8-directional characters, idle animations, attack frames. Way better than MJ for actual pixel sprites (Octopath/Stardew vibe)."],
  ["/Users/pg/CEREBRUM/personal-os/scripts/ex-pixel-agents.png", "*4. pixel-agents (reference)* — the OG Metro City office we vendored on Friday. Each Claude session = a character walking around. For comparison with what's possible."],
];

for (const [p, c] of shots) {
  console.log(`Sending ${p}`);
  await photo(p, c);
}

await send([
  "*Reply with one of:*",
  "• `rive` → I dispatch a Phase 0 research agent on Rive-for-agent-chars + you sleep, I report in the morning",
  "• `pixellab` → I sign up + generate pixel sprites of your wayfarer for the lab as a parallel variant",
  "• `hybrid` → MJ paint + Rive behavior layer (the recommendation). I prep both in parallel.",
  "• `stick with MJ` → fine, top up Legnext and we ship the remaining 7 portraits",
  "• `pick wayfarer 0-3 + bard 0-3` → I swap defaults from the earlier album",
].join("\n"));

console.log("done");
