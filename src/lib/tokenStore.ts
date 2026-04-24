/**
 * File-backed token store at ~/.pg-os/tokens.json
 *
 * Why: iron-session cookies break in too many ways for a single-user local dashboard.
 *   - localhost vs 127.0.0.1 host mismatches lose the cookie silently
 *   - 3-provider token set approaches the 4KB cookie limit
 *   - Incognito / browser cookie clears wipe everything
 *   - Whoop rotates refresh tokens; concurrent refreshes race
 *
 * This store: one source of truth on disk, atomic writes, per-provider mutex.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export type Provider = "google" | "spotify" | "whoop";

export type ProviderTokens = {
  refreshToken: string;
  accessToken?: string;
  expiresAt?: number; // epoch ms
  email?: string;     // google only
  updatedAt: number;  // epoch ms
};

type StoreShape = Partial<Record<Provider, ProviderTokens>>;

const STORE_DIR = path.join(os.homedir(), ".pg-os");
const STORE_PATH = path.join(STORE_DIR, "tokens.json");

let cache: StoreShape | null = null;
let readPromise: Promise<StoreShape> | null = null;
const refreshLocks: Partial<Record<Provider, Promise<ProviderTokens>>> = {};

async function ensureDir() {
  await fs.mkdir(STORE_DIR, { recursive: true, mode: 0o700 });
}

async function readStore(): Promise<StoreShape> {
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

async function writeStoreAtomic(next: StoreShape) {
  await ensureDir();
  const tmp = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
  await fs.rename(tmp, STORE_PATH);
  cache = next;
}

export async function getTokens(provider: Provider): Promise<ProviderTokens | undefined> {
  const store = await readStore();
  return store[provider];
}

export async function setTokens(provider: Provider, tokens: Omit<ProviderTokens, "updatedAt">) {
  const store = await readStore();
  const next: StoreShape = { ...store, [provider]: { ...tokens, updatedAt: Date.now() } };
  await writeStoreAtomic(next);
}

export async function clearTokens(provider: Provider) {
  const store = await readStore();
  if (!store[provider]) return;
  const next: StoreShape = { ...store };
  delete next[provider];
  await writeStoreAtomic(next);
}

export function isExpired(tokens: ProviderTokens | undefined, bufferMs = 30_000): boolean {
  if (!tokens) return true;
  if (!tokens.expiresAt) return true;
  return tokens.expiresAt < Date.now() + bufferMs;
}

/**
 * Serialize concurrent refresh attempts for the same provider.
 * Matters for Whoop (rotates refresh_token — concurrent refreshes invalidate each other).
 */
export async function withRefreshLock<T extends ProviderTokens>(
  provider: Provider,
  fn: () => Promise<T>,
): Promise<T> {
  const pending = refreshLocks[provider];
  if (pending) {
    // Someone else is refreshing — wait for their result and use it.
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

/**
 * Refresh + persist in one atomic step, with per-provider mutex.
 * Caller supplies the provider-specific refresh function.
 */
export async function refreshAndStore(
  provider: Provider,
  refreshFn: (refreshToken: string) => Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }>,
): Promise<ProviderTokens> {
  return withRefreshLock(provider, async () => {
    // Re-read inside the lock — another request may have beaten us.
    const current = await getTokens(provider);
    if (!current?.refreshToken) throw new Error(`${provider}_not_connected`);
    if (!isExpired(current)) return current;

    const refreshed = await refreshFn(current.refreshToken);
    await setTokens(provider, {
      refreshToken: refreshed.refresh_token ?? current.refreshToken,
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      email: current.email,
    });
    const updated = await getTokens(provider);
    if (!updated) throw new Error(`${provider}_store_failed`);
    return updated;
  });
}

/**
 * Summary for diagnostics — used by /api/status endpoint.
 * Never exposes actual tokens.
 */
export async function storeSummary() {
  const store = await readStore();
  const out: Record<string, { connected: boolean; email?: string; expiresInMs?: number; updatedAt?: number }> = {};
  for (const p of ["google", "spotify", "whoop"] as Provider[]) {
    const t = store[p];
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
