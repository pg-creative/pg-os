// Parse a single brain wiki markdown file → BrainEntry
// Uses gray-matter for frontmatter, derives fileType from path

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { BrainEntry, BrainEntryFrontmatter, FileType } from "./types";
import { pgPath } from "@/lib/paths";

const BRAIN_ROOT = process.env.BRAIN_LOCAL_ROOT || pgPath("brain");
const WIKI_ROOT = path.join(BRAIN_ROOT, "wiki");

const NAV_FILES = new Set(["index.md", "log.md", "by-tag.md"]);

function deriveFileType(relativePath: string): FileType {
  // relativePath looks like wiki/<type>/<slug>.md OR wiki/ideas/queue/<slug>.md
  const parts = relativePath.split("/");
  if (parts.length >= 3 && parts[1] === "ideas" && parts[2] === "queue")
    return "queue";
  if (parts.length >= 2) {
    const t = parts[1];
    if (
      t === "sources" ||
      t === "concepts" ||
      t === "playbooks" ||
      t === "synthesis"
    )
      return t;
  }
  return "concepts";
}

function deriveTitle(body: string, slug: string): string {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : slug.replace(/-/g, " ");
}

export function getBrainRoot(): string {
  return BRAIN_ROOT;
}

export function getWikiRoot(): string {
  return WIKI_ROOT;
}

export function parseEntry(absPath: string): BrainEntry | null {
  try {
    if (!fs.existsSync(absPath)) return null;
    const relativePath = path.relative(BRAIN_ROOT, absPath);
    const filename = path.basename(absPath);
    if (NAV_FILES.has(filename)) return null;
    if (!relativePath.startsWith("wiki/")) return null;

    const raw = fs.readFileSync(absPath, "utf-8");
    const { data, content } = matter(raw);
    const fm = data as BrainEntryFrontmatter;
    const stat = fs.statSync(absPath);
    const slug = filename.replace(/\.md$/, "");

    return {
      slug,
      fileType: deriveFileType(relativePath),
      path: absPath,
      relativePath,
      title: deriveTitle(content, slug),
      frontmatter: fm,
      body: content.trim(),
      modifiedAt: stat.mtimeMs,
    };
  } catch (e) {
    console.error(`[brain/parser] Failed to parse ${absPath}:`, e);
    return null;
  }
}

export function listAllEntries(): BrainEntry[] {
  const entries: BrainEntry[] = [];
  if (!fs.existsSync(WIKI_ROOT)) return entries;

  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) walk(full);
      else if (f.isFile() && f.name.endsWith(".md") && !NAV_FILES.has(f.name)) {
        const parsed = parseEntry(full);
        if (parsed) entries.push(parsed);
      }
    }
  };
  walk(WIKI_ROOT);
  return entries;
}

export function findEntryBySlug(slug: string): BrainEntry | null {
  const entries = listAllEntries();
  return entries.find((e) => e.slug === slug) ?? null;
}

export function updateEntryFrontmatter(
  absPath: string,
  patch: Partial<BrainEntryFrontmatter>,
): boolean {
  try {
    if (!fs.existsSync(absPath)) return false;
    const raw = fs.readFileSync(absPath, "utf-8");
    const parsed = matter(raw);
    const newData = {
      ...parsed.data,
      ...patch,
      last_touched: new Date().toISOString().slice(0, 10),
    };
    const rebuilt = matter.stringify(parsed.content, newData);
    fs.writeFileSync(absPath, rebuilt, "utf-8");
    return true;
  } catch (e) {
    console.error(`[brain/parser] Failed to update ${absPath}:`, e);
    return false;
  }
}
