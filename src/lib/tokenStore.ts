/**
 * Token store — Supabase oauth_tokens (primary, encrypted) with file-backed fallback.
 *
 * Why a custom store: iron-session cookies break in too many ways for a
 * single-user dashboard.
 *   - localhost vs 127.0.0.1 host mismatches lose the cookie silently
 *   - 3-provider token set approaches the 4KB cookie limit
 *   - Incognito / browser cookie clears wipe everything
 *   - Whoop rotates refresh tokens; concurrent refreshes race
 *
 * When PGOS_SUPABASE_URL is set: tokens live in Supabase, encrypted at rest with
 * AES-256-GCM using TOKEN_ENC_KEY (32 bytes, base64). Required: TOKEN_ENC_KEY
 * must also be set, otherwise the store falls back to file mode.
 *
 * When not configured: tokens live in ~/.pg-os/tokens.json (atomic writes, 0600).
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { db, isDbConfigured, T } from "./db";

export type Provider = "google" | "spotify" | "whoop";

export type ProviderTokens = {
  refreshToken: string;
  accessToken?: string;
  expiresAt?: number; // epoch ms
  email?: string;     // google only
  scope?: string;
  updatedAt: number;  // epoch ms
};

type StoreShape = Partial<Record<Provider, ProviderTokens>>;

const STORE_DIR = path.join(os.homedir(), ".pg-os");
const STORE_PATH = path.join(STORE_DIR, "tokens.json");

let cache: StoreShape | null = null;
let readPromise: Promise<StoreShape> | null = null;
const refreshLocks: Partial<Record<Provider, Promise<ProviderTokens>>> = {};

// ── Encryption ───────────────────────────────────────────────────────────────

function getEncKey(): Buffer | null {
  const raw = process.env.TOKEN_ENC_KEY;
  if (!raw) return null;
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) return null;
    return buf;
  } catch {
    return null;
  }
}

function encrypt(plaintext: string): string {
  const key = getEncKey();
  if (!key) throw new Error("TOKEN_ENC_KEY not configured (must be 32 bytes base64)");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

function decrypt(blob: string): string {
  const key = getEncKey();
  if (!key) throw new Error("TOKEN_ENC_KEY not configured");
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

function useSupabase(): boolean {
  return isDbConfigured() && getEncKey() !== null;
}

// ── File-backed primitives (fallback for dev) ────────────────────────────────

async function ensureDir() {
  await fs.mkdir(STORE_DIR, { recursive: true, mode: 0o700 });
}

async function readFileStore(): Promise<StoreShape> {
  if (cache) return cache;
  if (readPromise) return readPromise;
  readPromise = (async () => {
    try {
      const raw = await fs.readFile(STORE_PATH, "utf8");
      cache = JSON.parse(raw) as StoreShape;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        cache = {};
      } else {
        throw err;
      }
    }
    return cache!;
  })();
  try {
    return await readPromise;
  } finally {
    readPromise = null;
  }
}

async function writeFileStoreAtomic(next: StoreShape) {
  await ensureDir();
  const tmp = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
  await fs.rename(tmp, STORE_PATH);
  cache = next;
}

// ── Supabase primitives ──────────────────────────────────────────────────────

async function readSupabase(provider: Provider): Promise<ProviderTokens | undefined> {
  const { data, error } = await db()
    .from(T.oauth_tokens)
    .select("provider, access_token_enc, refresh_token_enc, expires_at, scope, email, updated_at")
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(`tokenStore read failed: ${error.message}`);
  if (!data) return undefined;

  const refreshToken = data.refresh_token_enc ? decrypt(data.refresh_token_enc) : "";
  const accessToken = data.access_token_enc ? decrypt(data.access_token_enc) : undefined;
  return {
    refreshToken,
    accessToken,
    expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : undefined,
    email: data.email ?? undefined,
    scope: data.scope ?? undefined,
    updatedAt: new Date(data.updated_at).getTime(),
  };
}

async function writeSupabase(provider: Provider, tokens: ProviderTokens) {
  const row = {
    provider,
    access_token_enc: tokens.accessToken ? encrypt(tokens.accessToken) : "",
    refresh_token_enc: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
    expires_at: tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
    scope: tokens.scope ?? null,
    email: tokens.email ?? null,
    updated_at: new Date(tokens.updatedAt).toISOString(),
  };
  const { error } = await db().from(T.oauth_tokens).upsert(row, { onConflict: "provider" });
  if (error) throw new Error(`tokenStore write failed: ${error.message}`);
}

async function deleteSupabase(provider: Provider) {
  await db().from(T.oauth_tokens).delete().eq("provider", provider);
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function getTokens(provider: Provider): Promise<ProviderTokens | undefined> {
  if (useSupabase()) return readSupabase(provider);
  const store = await readFileStore();
  return store[provider];
}

export async function setTokens(provider: Provider, tokens: Omit<ProviderTokens, "updatedAt">) {
  const full: ProviderTokens = { ...tokens, updatedAt: Date.now() };
  if (useSupabase()) {
    await writeSupabase(provider, full);
    return;
  }
  const store = await readFileStore();
  const next: StoreShape = { ...store, [provider]: full };
  await writeFileStoreAtomic(next);
}

export async function clearTokens(provider: Provider) {
  if (useSupabase()) {
    await deleteSupabase(provider);
    return;
  }
  const store = await readFileStore();
  if (!store[provider]) return;
  const next: StoreShape = { ...store };
  delete next[provider];
  await writeFileStoreAtomic(next);
}

export function isExpired(tokens: ProviderTokens | undefined, bufferMs = 30_000): boolean {
  if (!tokens) return true;
  if (!tokens.expiresAt) return true;
  return tokens.expiresAt < Date.now() + bufferMs;
}

export async function withRefreshLock<T extends ProviderTokens>(
  provider: Provider,
  fn: () => Promise<T>,
): Promise<T> {
  const pending = refreshLocks[provider];
  if (pending) {
    return (await pending) as T;
  }
  const p = (async () => {
    try {
      return await fn();
    } finally {
      delete refreshLocks[provider];
    }
  })();
  refreshLocks[provider] = p;
  return p;
}

export async function refreshAndStore(
  provider: Provider,
  refreshFn: (refreshToken: string) => Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }>,
): Promise<ProviderTokens> {
  return withRefreshLock(provider, async () => {
    const current = await getTokens(provider);
    if (!current?.refreshToken) throw new Error(`${provider}_not_connected`);
    if (!isExpired(current)) return current;

    const refreshed = await refreshFn(current.refreshToken);
    await setTokens(provider, {
      refreshToken: refreshed.refresh_token ?? current.refreshToken,
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      email: current.email,
      scope: current.scope,
    });
    const updated = await getTokens(provider);
    if (!updated) throw new Error(`${provider}_store_failed`);
    return updated;
  });
}

export async function storeSummary() {
  const out: Record<string, { connected: boolean; email?: string; expiresInMs?: number; updatedAt?: number }> = {};
  for (const p of ["google", "spotify", "whoop"] as Provider[]) {
    const t = await getTokens(p);
    out[p] = t
      ? {
          connected: true,
          email: t.email,
          expiresInMs: t.expiresAt ? t.expiresAt - Date.now() : undefined,
          updatedAt: t.updatedAt,
        }
      : { connected: false };
  }
  return out;
}
