#!/usr/bin/env node
/**
 * Resume downloader — fetches the 2 completed MJ jobs from the partial
 * agent-office run and saves all 4 candidates per job to the agent-office
 * asset path. Works around the saveAssets bug in fire-mj.mjs (which expects
 * a `variant` field this batch doesn't have).
 *
 * Reads job IDs from mj-state-agent-office.json. Skips fire-failed jobs.
 */

import { mkdirSync, createWriteStream, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE = join(__dirname, "mj-state-agent-office.json");
const OUT_DIR = join(dirname(__dirname), "public", "agent-office");

const API_KEY = process.env.LEGNEXT_API_KEY;
if (!API_KEY) {
  console.error("LEGNEXT_API_KEY not set");
  process.exit(1);
}

const state = JSON.parse(readFileSync(STATE, "utf-8"));
const pendingJobs = state.jobs.filter((j) => j.status === "pending" && j.job_id);

console.log(`Resuming ${pendingJobs.length} pending jobs`);

async function fetchJob(jobId) {
  const res = await fetch(`https://api.legnext.ai/api/v1/job/${jobId}`, {
    headers: { "x-api-key": API_KEY },
  });
  return res.json();
}

async function downloadImage(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  mkdirSync(dirname(dest), { recursive: true });
  await pipeline(res.body, createWriteStream(dest));
}

for (const job of pendingJobs) {
  console.log(`Polling ${job.id} -> ${job.job_id}`);
  const result = await fetchJob(job.job_id);
  if (result.status !== "completed") {
    console.log(`  not ready yet (status=${result.status}), skipping`);
    continue;
  }

  // slot format: "character/wayfarer" -> dir "character", base "wayfarer"
  const [section, base] = job.slot.split("/");
  const sectionDir = section === "character" ? "characters" : section === "environment" ? "environments" : section;
  const destDir = join(OUT_DIR, sectionDir);
  mkdirSync(destDir, { recursive: true });

  const urls = result.output?.image_urls || result.image_urls || [];
  console.log(`  ${urls.length} candidates`);
  for (let i = 0; i < urls.length; i++) {
    const dest = join(destDir, `${base}-${i}.png`);
    try {
      await downloadImage(urls[i], dest);
      console.log(`  saved ${dest}`);
    } catch (e) {
      console.error(`  download failed: ${e.message}`);
    }
  }

  // Default pick: candidate #0 becomes the lab asset
  const defaultPick = join(destDir, `${base}-0.png`);
  const labAsset = join(destDir, `${base}.png`);
  try {
    const { copyFileSync } = await import("node:fs");
    copyFileSync(defaultPick, labAsset);
    console.log(`  -> picked candidate 0 as ${labAsset}`);
  } catch (e) {
    console.error(`  pick failed: ${e.message}`);
  }
}

console.log("done");
