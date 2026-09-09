/**
 * Mount the cosmos: read the vault, render the words, hand over the stage.
 *
 * Shared by `/cosmos` and `/cosmos/<world>`, because in round two those are the
 * same scene. A deep link does not open a different page: it puts the Wayfarer
 * down in that biome and lets him walk out of it.
 *
 * The reader throws on a plateless page by contract. `readBodies` catches it per
 * world (the Critic's deduction 7: one bad page took every world down), and the
 * check that must fail loudly is the vault's own, in the pre-commit hook.
 */

import type { ReactNode } from "react";
import { CosmosStage } from "../_scene/CosmosStage";
import { readBodies, readCosmos, seasonLabel } from "./read";

/**
 * The vault body is markdown, and remark and rehype are deliberately not
 * installed: prose must never enter a client chunk of a public repo. The two
 * shapes the pages actually use, a blockquote and a paragraph, are rendered
 * here. Anything richer becomes a paragraph rather than raw markup on screen.
 *
 * A `(source: ...)` or `(file.md, "quoted thing")` citation left inline in a
 * body is DROPPED, not printed. The keeper moves those into `source:` where
 * they belong; until every page has been through that pass, this is the guard
 * that keeps a Higgsfield prompt from being read as PG's own writing.
 */
function renderBody(body: string): ReactNode {
  const blocks: { quote: boolean; text: string }[] = [];
  for (const raw of body.split(/\n{2,}/)) {
    const chunk = raw.trim();
    if (!chunk || chunk.startsWith("<!--")) continue;
    const quote = chunk.startsWith(">");
    const text = chunk
      .split("\n")
      .map((l) => (quote ? l.replace(/^>\s?/, "") : l))
      .join(" ")
      .trim()
      // A whole paragraph that is only a citation goes; an inline one is cut.
      .replace(/\((?:[^()]*\.(?:md|yml|json|jpg|png)[^()]*)\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!text) continue;
    blocks.push({ quote, text });
  }

  if (blocks.length === 0) {
    return <p className="cosmos-page-blank">The vault has not written this one yet.</p>;
  }

  return (
    <>
      {blocks.map((b, i) =>
        b.quote ? <blockquote key={i}>{b.text}</blockquote> : <p key={i}>{b.text}</p>,
      )}
    </>
  );
}

export function MountCosmos({
  fixture,
  world,
  drafts,
}: {
  fixture: string | null;
  world: string | null;
  drafts: boolean;
}) {
  const manifest = readCosmos({ fixture, world, drafts });
  const text = readBodies(drafts);

  const bodies: Record<string, ReactNode> = {};
  const sources: Record<string, string> = {};
  for (const w of manifest.worlds) {
    for (const o of w.objects) {
      const t = text[o.id];
      bodies[o.id] = renderBody(t?.body ?? "");
      if (t?.source) sources[o.id] = t.source;
    }
  }

  return (
    <CosmosStage
      manifest={manifest}
      bodies={bodies}
      sources={sources}
      season={seasonLabel(manifest)}
    />
  );
}
