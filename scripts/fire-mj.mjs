#!/usr/bin/env node
/* eslint-disable */
import { readFileSync, existsSync, mkdirSync, createWriteStream, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
// Allow overriding the prompts file via env var so alternate prompt batches
// (e.g. brand ideation) can reuse this pipeline without touching the main file.
const PROMPTS_FILE = join(__dirname, process.env.PROMPTS_FILE || 'mj-prompts.json');
const STATE_SUFFIX = process.env.PROMPTS_FILE ? `-${process.env.PROMPTS_FILE.replace(/^mj-prompts-?/, '').replace(/\.json$/, '')}` : '';
const STATE_FILE = join(__dirname, `mj-state${STATE_SUFFIX}.json`);
const LOG_FILE = join(__dirname, `mj-log${STATE_SUFFIX}.txt`);
const OUT_DIR = join(ROOT, 'public', 'mj-assets');

const API_KEY = process.env.LEGNEXT_API_KEY;
if (!API_KEY) {
  console.error('LEGNEXT_API_KEY not set');
  process.exit(1);
}

const ENDPOINT = 'https://api.legnext.ai/api/v1/diffusion';
const JOB_URL = (id) => `https://api.legnext.ai/api/v1/job/${id}`;
const POLL_INTERVAL_MS = 30_000;
const MAX_POLL_ATTEMPTS = 20; // 10 min per job max

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    writeFileSync(LOG_FILE, line + '\n', { flag: 'a' });
  } catch {}
}

function saveState(state) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log(`WARN: failed to save state: ${e.message}`);
  }
}

async function fireJob(job) {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: job.text }),
    });
    const data = await res.json();
    if (!data.job_id) {
      log(`FAIL fire ${job.id}: ${JSON.stringify(data.error || data)}`);
      return { ...job, job_id: null, status: 'fire-failed', error: data.error };
    }
    log(`FIRED ${job.id} -> ${data.job_id}`);
    return { ...job, job_id: data.job_id, status: 'pending' };
  } catch (e) {
    log(`FAIL fire ${job.id}: ${e.message}`);
    return { ...job, job_id: null, status: 'fire-failed', error: e.message };
  }
}

async function pollJob(job) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const res = await fetch(JOB_URL(job.job_id), {
        headers: { 'x-api-key': API_KEY },
      });
      const data = await res.json();
      if (data.status === 'completed') {
        const urls = data.output?.image_urls || [];
        log(`DONE  ${job.id} (${urls.length} images, ${data.meta?.usage?.consume || '?'} pts)`);
        return { ...job, status: 'completed', image_urls: urls };
      }
      if (data.status === 'failed') {
        log(`FAIL  ${job.id}: ${data.error?.message || 'unknown'}`);
        return { ...job, status: 'failed', error: data.error };
      }
      // still processing / pending — keep polling
    } catch (e) {
      log(`WARN poll ${job.id} attempt ${attempt}: ${e.message}`);
    }
  }
  log(`TIMEOUT ${job.id}`);
  return { ...job, status: 'timeout' };
}

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  mkdirSync(dirname(destPath), { recursive: true });
  await pipeline(res.body, createWriteStream(destPath));
}

async function saveAssets(job) {
  if (!job.image_urls?.length) return job;
  const variantDir = join(OUT_DIR, job.variant);
  mkdirSync(variantDir, { recursive: true });
  const paths = [];
  for (let i = 0; i < job.image_urls.length; i++) {
    const url = job.image_urls[i];
    const dest = join(variantDir, `${job.slot}-${i}.png`);
    try {
      await downloadImage(url, dest);
      paths.push(`public/mj-assets/${job.variant}/${job.slot}-${i}.png`);
    } catch (e) {
      log(`WARN download ${job.id} img ${i}: ${e.message}`);
    }
  }
  return { ...job, local_paths: paths };
}

async function main() {
  const { jobs } = JSON.parse(readFileSync(PROMPTS_FILE, 'utf-8'));
  log(`Loaded ${jobs.length} prompts`);

  mkdirSync(OUT_DIR, { recursive: true });

  // Phase 1: fire all in parallel (batched to avoid rate limits — 10 at a time)
  log(`Firing ${jobs.length} jobs in batches of 10...`);
  const fired = [];
  for (let i = 0; i < jobs.length; i += 10) {
    const batch = jobs.slice(i, i + 10);
    const results = await Promise.all(batch.map(fireJob));
    fired.push(...results);
    saveState({ phase: 'fired', jobs: fired });
    if (i + 10 < jobs.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const toPoll = fired.filter((j) => j.job_id && j.status === 'pending');
  log(`Fired ${fired.length} total (${toPoll.length} pending, ${fired.length - toPoll.length} fire-failed)`);

  // Phase 2: poll all in parallel
  log(`Polling ${toPoll.length} jobs (poll every ${POLL_INTERVAL_MS / 1000}s)...`);
  const polled = await Promise.all(toPoll.map(pollJob));

  // Phase 3: download completed
  const completed = polled.filter((j) => j.status === 'completed');
  log(`Downloading assets for ${completed.length} completed jobs...`);
  const downloaded = await Promise.all(completed.map(saveAssets));

  // Merge back into state
  const finalState = fired.map((j) => {
    const updated = downloaded.find((d) => d.id === j.id);
    if (updated) return updated;
    const polledJob = polled.find((p) => p.id === j.id);
    return polledJob || j;
  });
  saveState({ phase: 'done', jobs: finalState });

  const ok = finalState.filter((j) => j.status === 'completed').length;
  const fail = finalState.length - ok;
  log(`\nSUMMARY: ${ok}/${finalState.length} completed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  log(`FATAL: ${e.stack}`);
  process.exit(1);
});
