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
    "googleapis",
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
    ],
  },
};

export default config;
