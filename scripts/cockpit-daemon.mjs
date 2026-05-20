#!/usr/bin/env node
/**
 * PG OS Cockpit Daemon — the two-way-control spine.
 *
 * Standalone Node process (NOT inside Next.js) so it survives `pnpm dev`
 * restarts and owns a clean WebSocket lifecycle. Bound to 127.0.0.1 only,
 * guarded by a localhost token, so no other local process / CSRF can drive
 * your claude sessions.
 *
 * Architecture (patterns lifted from Ark0N/Codeman, MIT):
 *   - Each `claude` session is launched INSIDE a tmux session (`cockpit-<id8>`),
 *     spawned with `claude --session-id <uuid>` so the cockpit can join the
 *     terminal ⨯ telemetry (~/.pg-os/sessions/<uuid>.json) ⨯ activity-stream
 *     (<uuid>.jsonl) layers on the SAME id.
 *   - A browser xterm.js connects over WS; we attach a node-pty running
 *     `tmux attach-session -t cockpit-<id8>` and pipe bytes both ways.
 *   - Ghostty attaches to the SAME tmux session independently (`tmux attach`).
 *     tmux multiplexes — one pane, two real clients.
 *
 * HARD CONSTRAINT this respects: a PTY binds at fork time. Only sessions
 * LAUNCHED through this daemon (into tmux) are writable from the browser;
 * bare `claude` sessions remain observable via telemetry only. (The "all
 * sessions sync" north star is a later flip: route the default `claude`
 * alias through `cockpit-launch` and every session becomes tmux-backed.)
 *
 * Protocol (JSON text frames over WS):
 *   server→client  {"t":"o","d":"<bytes>"}   terminal output (8ms micro-batched)
 *   server→client  {"t":"exit","code":N}     pane process exited
 *   client→server  {"t":"i","d":"<bytes>"}   input (keystrokes / paste)
 *   client→server  {"t":"z","c":<cols>,"r":<rows>}  resize
 */

import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync, execFile } from "node:child_process";
import { createRequire } from "node:module";
import { WebSocketServer } from "ws";

const require = createRequire(import.meta.url);
const pty = require("node-pty");

// ─── Config ──────────────────────────────────────────────────────────────────

const HOST = "127.0.0.1";
const PORT = Number(process.env.COCKPIT_PORT || 7790);
const TMUX = process.env.COCKPIT_TMUX || "/opt/homebrew/bin/tmux";
const PREFIX = "cockpit-";
const STATE_DIR = path.join(os.homedir(), ".pg-os");
const TOKEN_FILE = path.join(STATE_DIR, "cockpit-token");
const WS_BATCH_MS = 8; // micro-batch terminal output (Codeman uses 8ms)
const WS_FLUSH_BYTES = 16 * 1024;

fs.mkdirSync(STATE_DIR, { recursive: true });

// Token: persist so it's stable across daemon restarts (the Next API reads it
// server-side and hands the browser a connection token).
function loadOrCreateToken() {
  try {
    const t = fs.readFileSync(TOKEN_FILE, "utf8").trim();
    if (t) return t;
  } catch {
    /* not created yet */
  }
  const t = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(TOKEN_FILE, t, { mode: 0o600 });
  return t;
}
const TOKEN = loadOrCreateToken();

// ─── tmux helpers ──────────────────────────────────────────────────────────

const muxName = (id) => `${PREFIX}${id.slice(0, 8)}`;

function tmux(args, opts = {}) {
  return execFileSync(TMUX, args, { encoding: "utf8", ...opts });
}

function tmuxHasSession(name) {
  try {
    tmux(["has-session", "-t", name], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a tmux session and launch the command inside it. 3-step sequence
 * (Codeman) avoids the cold-start race where the command runs before the
 * tmux server is ready:
 *   1. new-session -d with a plain shell (boots the server, stays alive)
 *   2. set remain-on-exit on (pane survives so we can read final output)
 *   3. respawn-pane -k to replace the shell with the real command (no echo)
 */
function createTmuxSession(id, cwd, cmd) {
  const name = muxName(id);
  if (tmuxHasSession(name)) return name;

  // Strip TMUX so we don't refuse to nest if the daemon itself is in tmux.
  const env = { ...process.env };
  delete env.TMUX;
  const ex = (args) => execFileSync(TMUX, args, { env, stdio: "ignore" });

  ex(["new-session", "-d", "-s", name, "-c", cwd]);
  ex(["set-option", "-t", name, "remain-on-exit", "on"]);
  ex(["set-option", "-t", name, "history-limit", "50000"]);
  ex(["set-option", "-t", name, "status", "off"]);
  // 24-bit color so the cel-shaded TUI palette survives.
  ex(["set-option", "-t", name, "-a", "terminal-overrides", ",*:Tc"]);
  // Replace the shell with the real command via a login shell (loads PATH so
  // `claude` resolves), cd into the project first.
  const full = `cd ${shq(cwd)} && ${cmd}`;
  ex(["respawn-pane", "-k", "-t", name, "bash", "-lc", full]);
  return name;
}

function killTmuxSession(id) {
  const name = muxName(id);
  try {
    tmux(["kill-session", "-t", name], { stdio: "ignore" });
  } catch {
    /* already gone */
  }
}

// List all cockpit-* tmux sessions with their pane working dir + dead state.
function listTmuxSessions() {
  let out = "";
  try {
    out = tmux([
      "list-sessions",
      "-F",
      "#{session_name}\t#{session_created}\t#{?pane_dead,dead,live}\t#{pane_current_path}",
    ]);
  } catch {
    return []; // no server running == no sessions
  }
  const rows = [];
  for (const line of out.split("\n")) {
    if (!line.startsWith(PREFIX)) continue;
    const [name, created, state, cwd] = line.split("\t");
    rows.push({
      muxName: name,
      idPrefix: name.slice(PREFIX.length),
      createdAt: Number(created) * 1000 || null,
      dead: state === "dead",
      cwd: cwd || null,
    });
  }
  return rows;
}

function shq(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

// id registry: full uuid ↔ muxName (tmux only keeps the 8-char prefix in the
// name). Persisted so a daemon restart can still map browser ids → sessions.
const SESSIONS_FILE = path.join(STATE_DIR, "cockpit-sessions.json");
function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
  } catch {
    return {};
  }
}
function saveRegistry(reg) {
  const tmp = `${SESSIONS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(reg, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, SESSIONS_FILE);
}
let registry = loadRegistry(); // { [fullId]: { cwd, cmd, name, createdAt } }

// Drop registry entries whose tmux session no longer exists.
function reconcile() {
  const live = new Set(listTmuxSessions().map((s) => s.muxName));
  let changed = false;
  for (const id of Object.keys(registry)) {
    if (!live.has(muxName(id))) {
      delete registry[id];
      changed = true;
    }
  }
  if (changed) saveRegistry(registry);
}
reconcile();

// ─── Auth ────────────────────────────────────────────────────────────────────

function tokenFromReq(req, url) {
  const header = req.headers["x-cockpit-token"];
  if (typeof header === "string" && header) return header;
  return url.searchParams.get("token");
}
const authOk = (req, url) => tokenFromReq(req, url) === TOKEN;

// ─── HTTP API ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  res.setHeader("Content-Type", "application/json");
  // Localhost-only CORS for the Next.js app.
  const origin = req.headers.origin || "";
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "x-cockpit-token, content-type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (url.pathname === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ ok: true, port: PORT, sessions: Object.keys(registry).length }));
  }

  if (!authOk(req, url)) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: "unauthorized" }));
  }

  if (url.pathname === "/sessions" && req.method === "GET") {
    reconcile();
    const live = listTmuxSessions();
    const sessions = Object.entries(registry).map(([id, meta]) => {
      const t = live.find((s) => s.muxName === muxName(id));
      return { id, ...meta, dead: t?.dead ?? true, attachCommand: `${TMUX} attach -t ${muxName(id)}` };
    });
    res.writeHead(200);
    return res.end(JSON.stringify({ sessions }));
  }

  if (url.pathname === "/sessions" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let payload = {};
      try {
        payload = JSON.parse(body || "{}");
      } catch {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "bad_json" }));
      }
      const cwd = payload.cwd || os.homedir();
      if (!fs.existsSync(cwd)) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "cwd_not_found", cwd }));
      }
      const id = crypto.randomUUID();
      // Default: launch claude bound to this id so all 3 data layers join on it.
      const cmd = payload.cmd || `claude --session-id ${id}`;
      try {
        const name = createTmuxSession(id, cwd, cmd);
        registry[id] = { cwd, cmd, name, createdAt: Date.now(), label: payload.label || path.basename(cwd) };
        saveRegistry(registry);
        res.writeHead(201);
        return res.end(JSON.stringify({ id, muxName: name, attachCommand: `${TMUX} attach -t ${name}` }));
      } catch (e) {
        res.writeHead(500);
        return res.end(JSON.stringify({ error: "create_failed", detail: String(e?.message || e) }));
      }
    });
    return;
  }

  const killMatch = url.pathname.match(/^\/sessions\/([^/]+)$/);
  if (killMatch && req.method === "DELETE") {
    const id = killMatch[1];
    killTmuxSession(id);
    delete registry[id];
    saveRegistry(registry);
    res.writeHead(200);
    return res.end(JSON.stringify({ ok: true }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "not_found" }));
});

// ─── WebSocket terminal bridge ───────────────────────────────────────────────

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (url.pathname !== "/terminal") {
    socket.destroy();
    return;
  }
  if (!authOk(req, url)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  const id = url.searchParams.get("session");
  const name = id ? muxName(id) : null;
  if (!name || !tmuxHasSession(name)) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => bridge(ws, id, name, url));
});

function bridge(ws, id, name, url) {
  const cols = clampInt(url.searchParams.get("cols"), 80, 1, 500);
  const rows = clampInt(url.searchParams.get("rows"), 24, 1, 200);

  const env = { ...process.env };
  delete env.TMUX;
  // node-pty runs a NEW tmux client attached to the same session — true sharing.
  const term = pty.spawn(TMUX, ["attach-session", "-t", name], {
    name: "xterm-256color",
    cols,
    rows,
    cwd: registry[id]?.cwd || os.homedir(),
    env,
  });

  // Output micro-batching: accumulate ~8ms of chunks, wrap in DEC 2026
  // synchronized-output markers so xterm renders the batch atomically (kills
  // the cursor-up flicker that Ink-based TUIs like claude produce).
  let batch = [];
  let bytes = 0;
  let timer = null;
  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!batch.length) return;
    const data = `\x1b[?2026h${batch.join("")}\x1b[?2026l`;
    batch = [];
    bytes = 0;
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ t: "o", d: data }));
  };
  term.onData((d) => {
    batch.push(d);
    bytes += d.length;
    if (bytes >= WS_FLUSH_BYTES) flush();
    else if (!timer) timer = setTimeout(flush, WS_BATCH_MS);
  });
  term.onExit(({ exitCode }) => {
    flush();
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ t: "exit", code: exitCode }));
    try {
      ws.close();
    } catch {
      /* noop */
    }
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.t === "i" && typeof msg.d === "string") {
      term.write(msg.d);
    } else if (msg.t === "z") {
      const c = clampInt(msg.c, cols, 1, 500);
      const r = clampInt(msg.r, rows, 1, 200);
      try {
        term.resize(c, r);
      } catch {
        /* pane gone */
      }
    }
  });

  const cleanup = () => {
    try {
      // Detach this client only (kill the attach process, NOT the session).
      term.kill();
    } catch {
      /* noop */
    }
  };
  ws.on("close", cleanup);
  ws.on("error", cleanup);

  // Repaint the full pane on connect so a reattaching browser sees current state.
  try {
    execFile(TMUX, ["refresh-client", "-t", name], () => {});
  } catch {
    /* noop */
  }
}

function clampInt(v, dflt, min, max) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}

// ─── Boot ────────────────────────────────────────────────────────────────────

server.listen(PORT, HOST, () => {
  process.stdout.write(
    `[cockpit-daemon] listening on http://${HOST}:${PORT} · token ${TOKEN_FILE} · tmux ${TMUX}\n` +
      `[cockpit-daemon] ${Object.keys(registry).length} session(s) in registry\n`,
  );
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
