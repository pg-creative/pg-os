/**
 * /cosmos redirects to the first world in the registry.
 *
 * EXTENDS: `worlds.yml`, which is the only place a world's existence is declared.
 * There is no hardcoded "quiet-practice" here: reorder the registry and this
 * follows, which is what "a second world is a folder plus a manifest line" means.
 */

import { redirect } from "next/navigation";
import { readWorlds } from "../../lib/cosmos/vault";

export const dynamic = "force-dynamic";

export default function CosmosIndex() {
  const worlds = readWorlds();
  // Unbuilt worlds have no folder yet; the first buildable one wins.
  const first = worlds.find((w) => w.status !== "unbuilt") ?? worlds[0];
  if (!first) redirect("/");
  redirect(`/cosmos/${first.id}`);
}
