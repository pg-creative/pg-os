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
      // Only in-project globs are listed: Turbopack rejects any pattern that
      // navigates out of the project root ("glob '../cosmos/**' is invalid"), so
      // ../cosmos and ../self/wall/plates cannot be named here. They do not need
      // to be. The tracer follows static imports, and /api/cosmos/asset reads its
      // files through a path computed at request time from COSMOS_ROOT, so there
      // is no static edge into those trees for it to follow. public/cosmos is
      // listed to keep it that way if a plate is ever staged inside the repo.
      "public/cosmos/**",
    ],
  },
};

export default config;
