/**
 * Cosmos asset route.
 *
 * EXTENDS: the repo's existing filesystem-backed routes (`api/projects`,
 * `api/claude/archive`), which already read outside `public/` and stream typed
 * bytes back. Same posture, one addition: plates never enter `public/`, because
 * `public/` is served by the CDN with no cookie check and the practice world is
 * private forever (plan 7g-1).
 *
 * URL shape: /api/cosmos/asset/<scope>/<path with NO extension>
 *   scope `vault` -> COSMOS_ROOT
 *   scope `wall`  -> <COSMOS_ROOT>/../self/wall/plates
 * Those two roots are the whole allowlist. Anything that resolves outside them,
 * and any segment containing `..`, is a 404.
 *
 * The extension is dropped on the way in and recovered on the way out by trying
 * a fixed list; the content type comes from the file's magic bytes, not from the
 * URL, so a renamed file cannot talk the browser into the wrong parser.
 */

import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { cosmosRoot, wallPlatesRoot } from "../../../../../lib/cosmos/vault";

export const dynamic = "force-dynamic";

/**
 * Tried in order against the extensionless path.
 *
 * `glb` and `mp3` joined in round three: the Wayfarer's Meshy model and the
 * hall's recorded bed. Neither goes anywhere near `public/`, for the same reason
 * no plate does. A GLB served as `application/octet-stream` still loads through
 * three's GLTFLoader, but it also caches badly through a proxy and reads as an
 * unknown download in a devtools panel, so the type is stated.
 */
const EXTENSIONS = ["webp", "jpg", "jpeg", "png", "avif", "mp4", "glb", "mp3", "json"];

const BY_EXT: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  avif: "image/avif",
  mp4: "video/mp4",
  glb: "model/gltf-binary",
  mp3: "audio/mpeg",
  json: "application/json",
};

/** Content type from the first bytes. Falls back to the extension map. */
function sniff(buf: Buffer, ext: string): string {
  if (buf.length >= 12) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    )
      return "image/png";
    const riff = buf.toString("ascii", 0, 4);
    const fmt = buf.toString("ascii", 8, 12);
    if (riff === "RIFF" && fmt === "WEBP") return "image/webp";
    // glTF binary: the magic is the four ASCII bytes "glTF", then a uint32
    // version. Checked before `ftyp` because a GLB has neither.
    if (riff === "glTF") return "model/gltf-binary";
    // MP3: an ID3 tag, or a raw frame sync (0xFF 0xEx/0xFx).
    if (buf.toString("ascii", 0, 3) === "ID3") return "audio/mpeg";
    if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "audio/mpeg";
    if (buf.toString("ascii", 4, 8) === "ftyp") {
      return fmt.startsWith("avif") || fmt.startsWith("avis")
        ? "image/avif"
        : "video/mp4";
    }
  }
  return BY_EXT[ext] ?? "application/octet-stream";
}

function rootFor(scope: string): string | null {
  if (scope === "vault") return path.resolve(cosmosRoot());
  if (scope === "wall") return path.resolve(wallPlatesRoot());
  return null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await ctx.params;
  if (!segments || segments.length < 2) {
    return new NextResponse(null, { status: 404 });
  }

  const [scope, ...rest] = segments;
  const root = rootFor(scope);
  if (!root) return new NextResponse(null, { status: 404 });

  // No traversal, no absolute segments, no dotfiles.
  if (rest.some((s) => s === "" || s === "." || s === ".." || s.includes("/") || s.startsWith("."))) {
    return new NextResponse(null, { status: 404 });
  }

  const base = path.resolve(root, ...rest);
  // Belt and braces: the resolved path must still sit under the allowlisted root.
  if (base !== root && !base.startsWith(root + path.sep)) {
    return new NextResponse(null, { status: 404 });
  }

  let file: string | null = null;
  let ext = "";
  for (const candidate of EXTENSIONS) {
    const withExt = `${base}.${candidate}`;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      file = withExt;
      ext = candidate;
      break;
    }
  }
  if (!file) return new NextResponse(null, { status: 404 });

  const buf = await fs.promises.readFile(file);
  const stat = await fs.promises.stat(file);

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": sniff(buf, ext),
      "Content-Length": String(buf.length),
      // Plates are immutable once generated; a new plate is a new filename.
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`,
      // Private art. Never let a proxy or a preview card hold a copy.
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
