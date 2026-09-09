/**
 * /cosmos — the world.
 *
 * Round one redirected here to `/cosmos/<first world>`, because a world was a
 * page. Round two has one persistent scene with every biome on one plane, so
 * this IS the route and `/cosmos/<world>` is a deep link into it.
 *
 * The reader runs at request time, never at build time (plan 7h, D3: a
 * build-time read freezes the layer that is supposed to evolve nightly).
 */

import { MountCosmos } from "./_data/mount";

export const dynamic = "force-dynamic";

export default async function CosmosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

  return (
    <MountCosmos
      fixture={one(sp.fixture)}
      world={null}
      drafts={one(sp.drafts) === "1"}
    />
  );
}
