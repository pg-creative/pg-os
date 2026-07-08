#!/usr/bin/env node
/**
 * Agent-office painterly batch — consolidated re-fire + poll + download.
 *
 * Built 2026-05-22 after Legnext credits were topped up. The original run left
 * 2 jobs "pending" (days-old job_ids, likely expired) and 7 "fire-failed" (402
 * insufficient quota). This script:
 *   1. Pre-polls any existing pending job_ids (free) — salvages if still alive.
 *   2. Re-fires every job that isn't already completed (fresh job_ids).
 *   3. Polls all pending to completion.
 *   4. Downloads all 4 candidates per job, slot-aware, to
 *      public/agent-office/{characters,environments}/, and copies candidate-0
 *      as the default lab asset (<base>.png) — matching resume-mj-download.mjs.
 *
 * Reads prompts from mj-prompts-agent-office.json, state from
 * mj-state-agent-office.json (both gitignored, main checkout only).
 */
import {
  readFileSync, writeFileSync, mkdirSync, createWriteStream, copyFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const PROMPTS = join(__dirname, "mj-prompts-agent-office.json");
const STATE = join(__dirname, "mj-state-agent-office.json");
const LOG = join(__dirname, "mj-log-agent-office.txt");
const OUT_DIR = join(ROOT, "public", "agent-office");

const API_KEY = process.env.LEGNEXT_API_KEY;
if (!API_KEY) { console.error("LEGNEXT_API_KEY not set"); process.exit(1); }

const ENDPOINT = "https://api.legnext.ai/api/v1/diffusion";
const JOB_URL = (id) => `https://api.legnext.ai/api/v1/job/${id}`;
const POLL_INTERVAL_MS = 30_000;
const MAX_POLL_ATTEMPTS = 30; // 15 min per job

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { writeFileSync(LOG, line + "\n", { flag: "a" }); } catch {}
}
function saveState(jobs, phase) {
  try { writeFileSync(STATE, JSON.stringify({ phase, jobs }, null, 2)); }
  catch (e) { log(`WARN save state: ${e.message}`); }
}

async function fireJob(job) {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text: job.text }),
    });
    const data = await res.json();
    if (!data.job_id) {
      log(`FAIL fire ${job.id}: ${JSON.stringify(data.error || data)}`);
      return { ...job, job_id: null, status: "fire-failed", error: data.error };
    }
    log(`FIRED ${job.id} -> ${data.job_id}`);
    return { ...job, job_id: data.job_id, status: "pending", error: null };
  } catch (e) {
    log(`FAIL fire ${job.id}: ${e.message}`);
    return { ...job, job_id: null, status: "fire-failed", error: e.message };
  }
}

async function pollOnce(jobId) {
  try {
    const res = await fetch(JOB_URL(jobId), { headers: { "x-api-key": API_KEY } });
    return await res.json();
  } catch (e) { return { status: "error", error: e.message }; }
}

async function pollUntilDone(job) {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const data = await pollOnce(job.job_id);
    if (data.status === "completed") {
      const urls = data.output?.image_urls || data.image_urls || [];
      log(`DONE  ${job.id} (${urls.length} imgs, ${data.meta?.usage?.consume || "?"} pts)`);
      return { ...job, status: "completed", image_urls: urls };
    }
    if (data.status === "failed") {
      log(`FAIL  ${job.id}: ${data.error?.message || "unknown"}`);
      return { ...job, status: "failed", error: data.error };
    }
  }
  log(`TIMEOUT ${job.id}`);
  return { ...job, status: "timeout" };
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  mkdirSync(dirname(dest), { recursive: true });
  await pipeline(res.body, createWriteStream(dest));
}

async function saveAssets(job) {
  const urls = job.image_urls || [];
  if (!urls.length) return job;
  const [section, base] = job.slot.split("/");
  const sectionDir = section === "character" ? "characters"
    : section === "environment" ? "environments" : section;
  const destDir = join(OUT_DIR, sectionDir);
  mkdirSync(destDir, { recursive: true });
  const paths = [];
  for (let i = 0; i < urls.length; i++) {
    const dest = join(destDir, `${base}-${i}.png`);
    try { await download(urls[i], dest); paths.push(dest); log(`  saved ${dest}`); }
    catch (e) { log(`  WARN dl ${job.id} #${i}: ${e.message}`); }
  }
  // default pick -> <base>.png
  try {
    copyFileSync(join(destDir, `${base}-0.png`), join(destDir, `${base}.png`));
    log(`  -> picked candidate 0 as ${base}.png`);
  } catch (e) { log(`  WARN pick ${job.id}: ${e.message}`); }
  return { ...job, local_paths: paths };
}

async function main() {
  const { jobs: prompts } = JSON.parse(readFileSync(PROMPTS, "utf-8"));
  let state;
  try { state = JSON.parse(readFileSync(STATE, "utf-8")); } catch { state = { jobs: [] }; }
  const prev = new Map(state.jobs.map((j) => [j.id, j]));

  // Merge: start from prompts, carry forward any prior job_id/status.
  let jobs = prompts.map((p) => ({ ...p, ...(prev.get(p.id) || {}) }));

  log(`=== agent-office batch: ${jobs.length} jobs ===`);

  // Phase 0: pre-poll existing pending job_ids (salvage days-old jobs for free).
  for (const j of jobs) {
    if (j.status === "completed") continue;
    if (j.job_id && j.status === "pending") {
      const d = await pollOnce(j.job_id);
      if (d.status === "completed") {
        j.status = "completed";
        j.image_urls = d.output?.image_urls || d.image_urls || [];
        log(`SALVAGED ${j.id} (already completed)`);
      } else {
        log(`stale ${j.id} (status=${d.status}) -> will re-fire`);
        j.job_id = null; j.status = "fire-failed";
      }
    }
  }
  saveState(jobs, "pre-polled");

  // Phase 1: re-fire everything not completed and lacking a live job_id.
  const toFire = jobs.filter((j) => j.status !== "completed" && !j.job_id);
  log(`Firing ${toFire.length} jobs...`);
  for (let i = 0; i < toFire.length; i += 5) {
    const batch = toFire.slice(i, i + 5);
    const fired = await Promise.all(batch.map(fireJob));
    fired.forEach((f) => { const idx = jobs.findIndex((j) => j.id === f.id); jobs[idx] = f; });
    saveState(jobs, "firing");
    if (i + 5 < toFire.length) await new Promise((r) => setTimeout(r, 2000));
  }

  // Phase 2: poll all pending.
  const pending = jobs.filter((j) => j.status === "pending" && j.job_id);
  log(`Polling ${pending.length} pending jobs...`);
  const polled = await Promise.all(pending.map(pollUntilDone));
  polled.forEach((p) => { const idx = jobs.findIndex((j) => j.id === p.id); jobs[idx] = p; });
  saveState(jobs, "polled");

  // Phase 3: download completed.
  const completed = jobs.filter((j) => j.status === "completed");
  log(`Downloading ${completed.length} completed jobs...`);
  const done = await Promise.all(completed.map(saveAssets));
  done.forEach((d) => { const idx = jobs.findIndex((j) => j.id === d.id); jobs[idx] = d; });
  saveState(jobs, "done");

  const ok = jobs.filter((j) => j.status === "completed").length;
  log(`SUMMARY: ${ok}/${jobs.length} completed`);
  process.exit(ok === jobs.length ? 0 : 1);
}

main().catch((e) => { log(`FATAL: ${e.stack}`); process.exit(1); });
