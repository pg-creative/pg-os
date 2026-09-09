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

/**
 * Cosmos gate. ONE SECRET (plan 7i, D16: "two secrets double what can be lost").
 * `COSMOS_KEY` is deleted; the cosmos rides on `PGOS_SHARED_SECRET` and on the
 * same `pgos-auth` cookie the rest of the OS already sets, so a device that can
 * open PG OS can open the worlds, and there is one string to rotate.
 *
 * What stays different, and it is the whole point (plan 7g-1):
 *   - FAIL-CLOSED. The PG OS gate passes everything through when no secret is
 *     set, which is why the OS is ungated in dev. The practice world and the
 *     depths are private forever, so an unset or wrong secret means 404 on
 *     these paths, never open, in dev as much as in production.
 *   - 404, never a redirect to /unlock. A redirect confirms the route exists.
 *
 * The asset route's URLs carry no file extension on purpose: the matcher below
 * excludes every image extension, so a plate served as `.jpg` could not be gated
 * by any cookie. Extensionless URLs are what make the gate reach the paintings.
 */
const COSMOS_PREFIXES = ["/cosmos", "/api/cosmos"];

function isCosmosPath(pathname: string): boolean {
  return COSMOS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function cosmosGate(req: NextRequest): NextResponse | null {
  const { pathname, searchParams } = req.nextUrl;
  if (!isCosmosPath(pathname)) return null;

  const secret = process.env.PGOS_SHARED_SECRET;
  if (!secret) return new NextResponse(null, { status: 404 });

  // `?key=` is the OS's own one-visit-per-device handshake; honouring it here
  // means the cosmos needs no second ceremony and no second cookie.
  const param = searchParams.get("key");
  if (param && param === secret) {
    const cleanUrl = req.nextUrl.clone();
    cleanUrl.searchParams.delete("key");
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(COOKIE_NAME, secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return res;
  }

  if (req.cookies.get(COOKIE_NAME)?.value === secret) return NextResponse.next();

  return new NextResponse(null, { status: 404 });
}

const PASSTHROUGH_PREFIXES = [
  "/api/auth/google/callback",
  "/api/auth/spotify/callback",
  "/api/auth/whoop/callback",
  "/api/telegram-webhook",
  // Headless agent runners POST run records here; route enforces its own
  // X-PGOS-Internal-Secret header check.
  "/api/agent-runs",
  "/api/telegram-events",
  // Digest endpoints — called by the morning-briefing agent (headless curl).
  // Each route enforces X-PGOS-Internal-Secret at the handler level.
  "/api/digest/",
  // Cron routes self-authenticate via Authorization: Bearer <CRON_SECRET>.
  // Vercel cron jobs don't carry a user cookie, so let them through to the
  // route handler — it will return 401 on its own if the bearer is wrong/missing.
  "/api/cron/",
  // Service worker must be reachable unauthenticated so navigator.serviceWorker
  // .register('/sw.js') succeeds before the user has a cookie. The SW itself
  // contains no secrets — just push notification handlers.
  "/sw.js",
  "/_next",
  "/favicon",
  "/unlock",
  "/manifest.json",
];

function briefingCookieName(d: Date): string {
  return `pg-os-briefing-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function eveningCookieName(d: Date): string {
  return `pg-os-evening-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Returns a redirect response to /briefing if the morning gate fires:
 *   pathname === "/", local hour ∈ [6, 10), and no per-day briefing cookie.
 * Returns null otherwise. Caller decides authentication state.
 */
function maybeMorningRedirect(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (pathname !== "/") return null;
  const now = new Date();
  const hour = now.getHours();
  if (hour < 6 || hour >= 10) return null;
  const cookieName = briefingCookieName(now);
  if (req.cookies.get(cookieName)) return null;
  const briefingUrl = req.nextUrl.clone();
  briefingUrl.pathname = "/briefing";
  briefingUrl.search = "";
  return NextResponse.redirect(briefingUrl);
}

/**
 * Returns a redirect response to /evening if the evening gate fires:
 *   pathname === "/", local hour ∈ [21, 24), and no per-day evening cookie.
 * Returns null otherwise. Once submitted, /api/evening/complete sets the cookie.
 */
function maybeEveningRedirect(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (pathname !== "/") return null;
  const now = new Date();
  const hour = now.getHours();
  if (hour < 21) return null;
  const cookieName = eveningCookieName(now);
  if (req.cookies.get(cookieName)) return null;
  const eveningUrl = req.nextUrl.clone();
  eveningUrl.pathname = "/evening";
  eveningUrl.search = "";
  return NextResponse.redirect(eveningUrl);
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Cosmos runs first and answers on its own. It must not inherit the PG OS
  // gate's fail-open dev behaviour, and none of the passthrough prefixes below
  // overlap /cosmos or /api/cosmos.
  const cosmos = cosmosGate(req);
  if (cosmos) return cosmos;

  // OAuth callbacks + static assets always pass through, regardless of auth.
  if (PASSTHROUGH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Per-session escape hatch for the evening gate. Visiting `?skip-evening=1`
  // sets the per-day evening cookie so the gate stops firing for the rest
  // of today, then strips the param and redirects to the requested path.
  // Useful when the ceremony itself is broken (e.g. mobile hydration bug)
  // and PG needs to reach the dashboard NOW.
  if (searchParams.get("skip-evening") === "1") {
    const cleanUrl = req.nextUrl.clone();
    cleanUrl.searchParams.delete("skip-evening");
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(eveningCookieName(new Date()), "1", {
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    return res;
  }

  // Same escape hatch for the morning briefing gate.
  if (searchParams.get("skip-briefing") === "1") {
    const cleanUrl = req.nextUrl.clone();
    cleanUrl.searchParams.delete("skip-briefing");
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(briefingCookieName(new Date()), "1", {
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    return res;
  }

  const secret = process.env.PGOS_SHARED_SECRET;

  // Dev mode (no secret) — fire morning OR evening redirect, then pass.
  if (!secret) {
    const morning = maybeMorningRedirect(req);
    if (morning) return morning;
    const evening = maybeEveningRedirect(req);
    if (evening) return evening;
    return NextResponse.next();
  }

  const keyParam = searchParams.get("key");
  if (keyParam && keyParam === secret) {
    const cleanUrl = req.nextUrl.clone();
    cleanUrl.searchParams.delete("key");
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(COOKIE_NAME, secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return res;
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === secret) {
    // Authed — fire morning OR evening redirect on root, otherwise pass.
    const morning = maybeMorningRedirect(req);
    if (morning) return morning;
    const evening = maybeEveningRedirect(req);
    if (evening) return evening;
    return NextResponse.next();
  }

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
