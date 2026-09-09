import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // Vercel function size: api/briefing was ballooning to ~745MB because Next's
  // file tracer was pulling heavy deps into the bundle (googleapis, mermaid)
  // and incidentally dragging public/ asset trees + scripts/ into the trace.
  //
  // serverExternalPackages: tell Next NOT to bundle these — Vercel installs
  // them into node_modules and the runtime loads them from there.
  serverExternalPackages: [
    "@googleapis/calendar",
    "google-auth-library",
    "mermaid",
    "chokidar",
    "@notionhq/client",
    "@anthropic-ai/sdk",
  ],

  // outputFileTracingExcludes: prevent the tracer from sweeping in large
  // local trees that have no business inside a serverless function bundle.
  // Sprites/art live in public/ and are served statically by Vercel's CDN —
  // they must NEVER end up inside a function. Scripts/local-config dirs
  // similarly never need to ship.
  outputFileTracingExcludes: {
    "*": [
      "public/agent-office/**",
      "public/art/**",
      "public/mj-assets/**",
      "public/icon-variants/**",
      "scripts/**",
      "docs/**",
      ".claude/**",
      ".next/cache/**",
      "node_modules/@next/swc-*/**",
      // Cosmos plates, so a world's 96-frame sequence can never be swept into a
      // function bundle the way public/art once ballooned api/briefing to ~745MB.
      //
      // Retried 2026-09-09 with ABSOLUTE paths, after relative `../cosmos/**` was
      // rejected as an out-of-root glob. Absolute paths are accepted: the tracer
      // resolves excludes against outputFileTracingRoot (the project root here),
      // and an absolute pattern sidesteps the `..` check that rejects the
      // relative form. Verified by a clean `pnpm build`; if a future Next drops
      // that, the fallback is unchanged behaviour, because there is no static
      // edge into these trees anyway: the tracer follows imports, and
      // /api/cosmos/asset computes its paths at request time from COSMOS_ROOT.
      "/Users/pg/cortex/cosmos/**",
      "/Users/pg/cortex/self/wall/plates/**",
      // And the in-repo staging path, to keep it that way if a plate ever lands
      // inside the project by hand.
      "public/cosmos/**",
    ],
  },
};

export default config;
