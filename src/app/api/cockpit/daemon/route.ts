import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export const dynamic = "force-dynamic";

// Bridges the browser to the standalone cockpit daemon. The daemon writes its
// token to ~/.pg-os/cockpit-token (0600); we read it server-side and hand the
// client the {port, token} it needs to open the terminal WebSocket. This is a
// localhost-only personal tool, so the token only ever crosses loopback.
const PORT = Number(process.env.COCKPIT_PORT || 7790);
const TOKEN_FILE = path.join(os.homedir(), ".pg-os", "cockpit-token");

async function readToken(): Promise<string | null> {
  try {
    const t = (await fs.readFile(TOKEN_FILE, "utf8")).trim();
    return t || null;
  } catch {
    return null;
  }
}

async function daemonUp(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 800);
    const r = await fetch(`http://127.0.0.1:${PORT}/health`, {
      signal: ctrl.signal,
    });
    clearTimeout(to);
    return r.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const [token, running] = await Promise.all([readToken(), daemonUp()]);
  return NextResponse.json({
    running,
    port: PORT,
    token,
    // The browser opens this directly (loopback): ws://127.0.0.1:<port>/terminal?session=<id>&token=<token>
    wsBase: `ws://127.0.0.1:${PORT}/terminal`,
    httpBase: `http://127.0.0.1:${PORT}`,
    launchHint:
      "Daemon down — start it: node scripts/cockpit-daemon.mjs (or pnpm cockpit:daemon)",
  });
}
