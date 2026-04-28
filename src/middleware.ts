import { NextRequest, NextResponse } from "next/server";

/**
 * Single-user middleware for the deployed PG OS.
 *
 * Behavior:
 * - If PGOS_SHARED_SECRET is NOT set (dev mode, no cloud) → pass everything through.
 * - If PGOS_SHARED_SECRET IS set:
 *     - OAuth callback routes always pass through (providers must reach them).
 *     - Static assets, _next, favicon, /unlock pass through.
 *     - Visiting `/?key=<secret>` (or any path with `?key=<secret>`) sets the
 *       `pgos-auth` cookie and redirects to the same path without the param.
 *     - Otherwise the request must carry a `pgos-auth` cookie whose value matches
 *       the secret. Mismatch → 302 to /unlock with a query hint.
 *
 * The cookie is httpOnly + secure + sameSite=strict, set with a 90-day TTL.
 * Rotation: change PGOS_SHARED_SECRET and re-visit `?key=<new>` from each device.
 */

const COOKIE_NAME = "pgos-auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

const PASSTHROUGH_PREFIXES = [
  "/api/auth/google/callback",
  "/api/auth/spotify/callback",
  "/api/auth/whoop/callback",
  "/api/telegram-webhook",
  // Cron routes self-authenticate via Authorization: Bearer <CRON_SECRET>.
  // Vercel cron jobs don't carry a user cookie, so let them through to the
  // route handler — it will return 401 on its own if the bearer is wrong/missing.
  "/api/cron/",
  "/_next",
  "/favicon",
  "/unlock",
  "/manifest.json",
];

export function middleware(req: NextRequest) {
  const secret = process.env.PGOS_SHARED_SECRET;
  if (!secret) return NextResponse.next();

  const { pathname, searchParams } = req.nextUrl;

  if (PASSTHROUGH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const keyParam = searchParams.get("key");
  if (keyParam && keyParam === secret) {
    // Set cookie, redirect to clean URL
    const cleanUrl = req.nextUrl.clone();
    cleanUrl.searchParams.delete("key");
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(COOKIE_NAME, secret, {
      httpOnly: true,
      sameSite: "strict",
      secure: req.nextUrl.protocol === "https:",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return res;
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === secret) return NextResponse.next();

  // Not authenticated. Send to /unlock with a hint to use ?key=
  const unlock = req.nextUrl.clone();
  unlock.pathname = "/unlock";
  unlock.search = "";
  return NextResponse.redirect(unlock);
}

export const config = {
  matcher: [
    // Match everything except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)).*)",
  ],
};
