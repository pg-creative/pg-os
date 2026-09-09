/**
 * /cosmos/<world> — the server component.
 *
 * EXTENDS: `src/lib/cosmos/vault.ts` (the request-time reader) and
 * `src/lib/cosmos/layout.ts` (server-side geometry). It reads the vault, emits a
 * manifest of ids, geometry and asset URLs, and renders every page's prose into
 * DOM nodes that travel in the RSC payload behind the gate.
 *
 * Prose never enters a client chunk: `/_next` is served unauthenticated by the
 * middleware's passthrough list, while `/cosmos` is not. So bodies are rendered
 * here and handed to the client as ready-made nodes, never as strings in props
 * that get bundled.
 *
 * The reader throws on a plateless page, and that throw is deliberately NOT
 * caught: "no page without a plate" is only a test if the build actually breaks.
 */

import { notFound } from "next/navigation";
import type { Phase } from "../../_components/emaki/theme";
import {
  heroLqipDataUri,
  loopFrames,
  readAttention,
  readMonuments,
  readPages,
  readWeather,
  readWorlds,
  sceneForRegister,
  assetUrl,
  cosmosRoot,
  heroUrlFor,
} from "../../../lib/cosmos/vault";
import { placeMonument, placeObject, untouchedFor } from "../../../lib/cosmos/layout";
import type { MonumentSpec, ObjectSpec, SceneManifest } from "../_scene/types";
import { WorldStage } from "./WorldStage";

export const dynamic = "force-dynamic";

/** From worlds.yml. A world with no folder yet still gets a route entry. */
export function generateStaticParams() {
  try {
    return readWorlds().map((w) => ({ world: w.id }));
  } catch {
    return [];
  }
}

/**
 * The vault body is markdown, but remark and rehype are deliberately not
 * installed: prose must never enter a client chunk of a public repo. So the two
 * shapes the round-one pages actually use, blockquote lines and plain
 * paragraphs, are rendered directly. Anything richer becomes a paragraph.
 */
function renderBody(body: string) {
  const blocks: { quote: boolean; text: string }[] = [];
  for (const raw of body.split(/\n{2,}/)) {
    const chunk = raw.trim();
    if (!chunk || chunk.startsWith("<!--")) continue;
    const quote = chunk.startsWith(">");
    blocks.push({
      quote,
      text: chunk
        .split("\n")
        .map((l) => (quote ? l.replace(/^>\s?/, "") : l))
        .join(" ")
        .trim(),
    });
  }
  return (
    <>
      {blocks.map((b, i) =>
        b.quote ? (
          <blockquote key={i}>{b.text}</blockquote>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </>
  );
}

export default async function WorldPage({
  params,
  searchParams,
}: {
  params: Promise<{ world: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { world: worldId } = await params;
  const sp = await searchParams;
  const drafts = sp.drafts === "1";

  const world = readWorlds().find((w) => w.id === worldId);
  if (!world || world.status === "unbuilt") notFound();

  const root = cosmosRoot();
  const preset = sceneForRegister(world.register);
  const attention = readAttention(root);

  // Throws on the first plateless page, by design.
  const pages = readPages(worldId, { drafts }, root);

  const objects: ObjectSpec[] = pages.map((p, i) => {
    const place = placeObject(p.id, i, pages.length);
    return {
      id: p.id,
      title: p.title,
      type: p.type,
      x: place.x,
      y: place.y,
      z: place.z,
      scale: place.scale,
      spin: place.spin,
      untouched: untouchedFor(attention[p.id]),
      plate: assetUrl(root, p.plate),
    };
  });

  const ledger = readMonuments(root);
  const monuments: MonumentSpec[] = ledger.map((m, i) => {
    const place = placeMonument(i, ledger.length);
    return {
      id: m.id,
      date: m.date,
      x: place.x,
      y: place.y,
      z: place.z,
      scale: place.scale,
    };
  });

  const heroUrl = heroUrlFor(worldId, "a", world.heroPlate, root);
  if (!heroUrl) notFound();
  const heroAltUrl = heroUrlFor(worldId, "b", world.heroPlateAlt, root);

  const weatherRaw = readWeather(root) as Record<string, unknown>;

  const manifest: SceneManifest = {
    worldId,
    title: world.title,
    register: world.register ?? "painted",
    // Pinned by the world for round one; a twilight world is twilight at lunch.
    phase: (world.phase as Phase) ?? "twilight",
    preset,
    hero: heroUrl,
    heroAlt: heroAltUrl,
    lqip: heroLqipDataUri(worldId, root),
    frames: loopFrames(worldId, root),
    frameRate: 12,
    objects,
    monuments,
    weather: {
      recovery: typeof weatherRaw.recovery === "number" ? weatherRaw.recovery : null,
      pages_days_ago:
        typeof weatherRaw.pages_days_ago === "number" ? weatherRaw.pages_days_ago : null,
      days_since_ship:
        typeof weatherRaw.days_since_ship === "number" ? weatherRaw.days_since_ship : null,
      sky: typeof weatherRaw.sky === "string" ? weatherRaw.sky : null,
      season_day: typeof weatherRaw.season_day === "number" ? weatherRaw.season_day : null,
    },
    drafts,
  };

  const panels = Object.fromEntries(pages.map((p) => [p.id, renderBody(p.body)]));

  return <WorldStage manifest={manifest} panels={panels} />;
}
