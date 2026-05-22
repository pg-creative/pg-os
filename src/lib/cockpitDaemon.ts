/**
 * Server-side bridge to the standalone cockpit daemon (scripts/cockpit-daemon.mjs).
 *
 * The daemon runs a localhost HTTP/WebSocket server (default :7790) guarded by a
 * token it writes to ~/.pg-os/cockpit-token (0600). The browser already talks to
 * the daemon directly for the live terminal, but for project -> session wiring we
 * go through the Next server so the token never has to leave the machine just to
 * resolve a project path. This helper centralizes that access.
 *
 * Contract (from cockpit-daemon.mjs):
 *   GET  /health            -> { ok, port, sessions }
 *   GET  /sessions          -> { sessions: [{ id, cwd, cmd, name, createdAt, label, dead, attachCommand }] }
 *   POST /sessions {cwd,label,cmd?} -> 201 { id, muxName, attachCommand }   (runs `claude --session-id <id>`)
 * Auth: x-cockpit-token header.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const PORT = Number(process.env.COCKPIT_PORT || 7790);
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN_FILE = path.join(os.homedir(), ".pg-os", "cockpit-token");

export type CockpitSession = {
  id: string;
  cwd: string;
  label?: string;
  cmd?: string;
  createdAt?: number;
  dead?: boolean;
  attachCommand?: string;
};

async function readToken(): Promise<string | null> {
  try {
    const t = (await fs.readFile(TOKEN_FILE, "utf8")).trim();
    return t || null;
  } catch {
    return null;
  }
}

async function daemonFetch(
  pathname: string,
  init?: RequestInit,
): Promise<Response | null> {
  const token = await readToken();
  if (!token) return null;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 2000);
  try {
    return await fetch(`${BASE}${pathname}`, {
      ...init,
      headers: {
        "x-cockpit-token": token,
        "content-type": "application/json",
        ...(init?.headers || {}),
      },
      signal: ctrl.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

/** True if the daemon answers /health on loopback. */
export async function daemonUp(): Promise<boolean> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 800);
  try {
    const r = await fetch(`${BASE}/health`, { signal: ctrl.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(to);
  }
}

/** Live sessions known to the daemon (empty array if daemon down / no token). */
export async function listCockpitSessions(): Promise<CockpitSession[]> {
  const r = await daemonFetch("/sessions");
  if (!r || !r.ok) return [];
  try {
    const data = (await r.json()) as { sessions?: CockpitSession[] };
    return Array.isArray(data.sessions) ? data.sessions : [];
  } catch {
    return [];
  }
}

export type LaunchCockpitResult =
  | { ok: true; id: string; attachCommand?: string }
  | { ok: false; error: string };

/** Launch a Claude Code session in the daemon (tmux + node-pty) at `cwd`. */
export async function launchCockpitSession(
  cwd: string,
  label?: string,
): Promise<LaunchCockpitResult> {
  const r = await daemonFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({ cwd, label }),
  });
  if (!r) return { ok: false, error: "daemon_unreachable" };
  let data: { id?: string; attachCommand?: string; error?: string } = {};
  try {
    data = await r.json();
  } catch {
    /* fall through to status check */
  }
  if (r.status === 201 && data.id)
    return { ok: true, id: data.id, attachCommand: data.attachCommand };
  return { ok: false, error: data.error || `daemon_status_${r.status}` };
}

/** Kill a daemon-backed session (DELETE /sessions/:id). */
export async function killCockpitSession(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const r = await daemonFetch(`/sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!r) return { ok: false, error: "daemon_unreachable" };
  if (r.ok) return { ok: true };
  return { ok: false, error: `daemon_status_${r.status}` };
}
