#!/usr/bin/env node
/**
 * Push the 8 MJ candidates + lab screenshot + status text to PG's Telegram
 * via the CLAUDIA bot. Lets PG pick wayfarer + bard winners from his phone.
 *
 * Uses TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID from personal-os/.env.local
 * (read here directly via dotenv-less parse).
 */

import { readFileSync, createReadStream } from "node:fs";
import { Blob } from "node:buffer";

const ENV_PATH = "/Users/pg/CEREBRUM/personal-os/.env.local";
const env = Object.fromEntries(
  readFileSync(ENV_PATH, "utf-8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = env.TELEGRAM_CHAT_ID;
const API = (m) => `https://api.telegram.org/bot${TOKEN}/${m}`;

async function sendMessage(text) {
  const res = await fetch(API("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" }),
  });
  const j = await res.json();
  if (!j.ok) console.error("sendMessage fail:", j);
  return j;
}

async function sendPhoto(filePath, caption) {
  const buf = readFileSync(filePath);
  const fd = new FormData();
  fd.append("chat_id", CHAT_ID);
  if (caption) fd.append("caption", caption);
  fd.append("photo", new Blob([buf], { type: "image/png" }), filePath.split("/").pop());
  const res = await fetch(API("sendPhoto"), { method: "POST", body: fd });
  const j = await res.json();
  if (!j.ok) console.error(`sendPhoto fail (${filePath}):`, j);
  return j;
}

async function sendMediaGroup(items) {
  const fd = new FormData();
  fd.append("chat_id", CHAT_ID);
  const media = items.map((item, i) => ({
    type: "photo",
    media: `attach://photo${i}`,
    ...(item.caption && i === 0 ? { caption: item.caption } : {}),
  }));
  fd.append("media", JSON.stringify(media));
  for (let i = 0; i < items.length; i++) {
    const buf = readFileSync(items[i].path);
    fd.append(`photo${i}`, new Blob([buf], { type: "image/png" }), `photo${i}.png`);
  }
  const res = await fetch(API("sendMediaGroup"), { method: "POST", body: fd });
  const j = await res.json();
  if (!j.ok) console.error("sendMediaGroup fail:", j);
  return j;
}

const ASSETS = "/Users/pg/CEREBRUM/personal-os/public/agent-office/characters";
const LAB_SHOT = "/Users/pg/CEREBRUM/personal-os/scripts/mj-portrait-live.png";

const STATUS = [
  "*Phase 2.5 partial — design-lab MJ batch*",
  "",
  "✓ 2 of 9 prompts succeeded: *wayfarer* + *bard*",
  "✗ 7 prompts hit Legnext 402 quota: scribe / smith / sage / ranger / atelier / camp / guild",
  "",
  "Lab live at `http://127.0.0.1:3030/dev/agent-office-lab?section=character&variant=mj-portrait`",
  "",
  "*Sending:* 4 wayfarer candidates → 4 bard candidates → current lab state.",
  "",
  "*Reply with two numbers (0-3 each):*",
  "  • wayfarer pick",
  "  • bard pick",
  "",
  "I'll swap defaults + standby for Legnext top-up to fire the remaining 7.",
].join("\n");

console.log("Sending status...");
await sendMessage(STATUS);

console.log("Sending wayfarer album...");
await sendMediaGroup([
  { path: `${ASSETS}/wayfarer-0.png`, caption: "Wayfarer candidates (0, 1, 2, 3) — reply with the number you want as default" },
  { path: `${ASSETS}/wayfarer-1.png` },
  { path: `${ASSETS}/wayfarer-2.png` },
  { path: `${ASSETS}/wayfarer-3.png` },
]);

console.log("Sending bard album...");
await sendMediaGroup([
  { path: `${ASSETS}/bard-0.png`, caption: "Bard candidates (0, 1, 2, 3) — reply with the number" },
  { path: `${ASSETS}/bard-1.png` },
  { path: `${ASSETS}/bard-2.png` },
  { path: `${ASSETS}/bard-3.png` },
]);

console.log("Sending lab screenshot...");
await sendPhoto(LAB_SHOT, "Current lab — MJ Portrait variant with wayfarer-0 as default. The 4 character cards = your 4 live Claude Code sessions.");

console.log("done");
