/**
 * /cosmos/<world> — a deep link to a biome.
 *
 * Not a second scene. The same persistent world, with the Wayfarer put down at
 * that biome's edge so he walks into it, which is what "one traveler, many
 * worlds" means once the worlds share a plane. Walking out of it is allowed and
 * the URL does not follow him: the address is where he entered, not where he is.
 *
 * An unknown id is a 404 rather than a silent fall back to the hall, so a
 * mistyped world never quietly looks like it worked.
 */

import { notFound } from "next/navigation";
import { MountCosmos } from "../_data/mount";
import { readCosmos } from "../_data/read";

export const dynamic = "force-dynamic";

export default async function WorldDeepLink({
  params,
  searchParams,
}: {
  params: Promise<{ world: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { world } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  const fixture = one(sp.fixture);

  const manifest = readCosmos({ fixture, world: null, drafts: false });
  if (!manifest.worlds.some((w) => w.id === world)) notFound();

  return (
    <MountCosmos fixture={fixture} world={world} drafts={one(sp.drafts)} />
  );
}
