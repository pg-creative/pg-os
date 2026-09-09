/**
 * Vault contract check.
 *
 * EXTENDS: nothing. This repo has no test runner (package.json has no `test`
 * script), so the two rules SCHEMA.md calls tests get a runnable script instead
 * of a promise. The Critic deletes a `plate:` line and expects a non-zero exit.
 *
 *   node --experimental-strip-types scripts/cosmos-vault-check.ts
 *   COSMOS_ROOT=/Users/pg/cortex/cosmos node scripts/cosmos-vault-check.ts
 *
 * Checks:
 *   1. worlds.yml parses and quiet-practice is in it.
 *   2. Every page in every page dir parses AND names a plate that exists.
 *   3. A page with its `plate:` line removed throws (tested in memory, no file touched).
 *   4. Draft pages are hidden without drafts, visible with them.
 *   5. Every plate path resolves inside one of the two allowlisted roots.
 */

import fs from "node:fs";
import path from "node:path";
import {
  cosmosRoot,
  isProp,
  parsePage,
  parseWorldsYml,
  PROPS,
  readAllManifests,
  readLayoutBlock,
  readPages,
  readWorlds,
  REGISTERS,
  resolveVaultPath,
  VaultError,
} from "../src/lib/cosmos/vault.ts";

const root = cosmosRoot();
let failures = 0;

function ok(msg: string) {
  console.log(`  ok    ${msg}`);
}
function fail(msg: string) {
  failures++;
  console.log(`  FAIL  ${msg}`);
}

console.log(`cosmos vault check, root ${root}`);

// 1. Registry.
try {
  const worlds = parseWorldsYml(
    fs.readFileSync(path.join(root, "worlds.yml"), "utf8"),
  );
  if (worlds.length === 0) fail("worlds.yml parsed to zero worlds");
  else ok(`worlds.yml parses, ${worlds.length} worlds`);
  if (!worlds.find((w) => w.id === "quiet-practice"))
    fail("quiet-practice missing from worlds.yml");
  else ok("quiet-practice is registered");

  const merged = readWorlds(root);
  const qp = merged.find((w) => w.id === "quiet-practice");
  if (!qp?.heroPlate) fail("quiet-practice has no hero_plate");
  else if (!resolveVaultPath(root, qp.heroPlate))
    fail(`hero_plate escapes both allowlisted roots: ${qp.heroPlate}`);
  else if (!fs.existsSync(resolveVaultPath(root, qp.heroPlate)!.abs))
    fail(`hero_plate is not on disk: ${qp.heroPlate}`);
  else ok("quiet-practice hero_plate resolves and exists");

  // Round two lifts D9 ("sky by hour returns"), so `clock` is legal now; the
  // hall stays twilight-tinted through its register, not through a pinned phase.
  const PHASES = ["day", "twilight", "midnight", "night", "clock", null];
  if (!PHASES.includes(qp?.phase ?? null))
    fail(`world.yml phase is ${qp?.phase}, which is not one of ${PHASES.join(", ")}`);
  else ok(`phase is ${qp?.phase ?? "unset (follows the clock)"}`);

  // ONE register map, and it is `src/lib/cosmos/registers.ts` (the Critic's
  // deduction 12: two maps of the four registers disagreed about the same hex).
  // Every register any world declares must have a complete look in it.
  const LOOK_KEYS = ["sky", "ground", "grass", "mist", "grain", "particles", "fog", "bed"];
  let registerFailures = 0;
  for (const w of merged) {
    if (!w.register) continue;
    const look = REGISTERS[w.register] as unknown as Record<string, unknown>;
    if (!look) {
      fail(`${w.id}: register ${w.register} has no look in registers.ts`);
      registerFailures++;
      continue;
    }
    for (const k of LOOK_KEYS) {
      if (look[k] === undefined) {
        fail(`${w.id}: register ${w.register} has no ${k} in registers.ts`);
        registerFailures++;
      }
    }
  }
  if (registerFailures === 0)
    ok(`every register in worlds.yml has a full look in registers.ts (${Object.keys(REGISTERS).length} registers)`);
} catch (err) {
  fail(`worlds.yml: ${(err as Error).message}`);
}

// 2. Every page, plate rule enforced by readPages itself.
try {
  const drafts = readPages("quiet-practice", { drafts: true }, root);
  if (drafts.length === 0) fail("no pages found for quiet-practice");
  else ok(`${drafts.length} pages parse and every plate exists`);

  // 4. Draft filtering.
  const canon = readPages("quiet-practice", {}, root);
  const draftCount = drafts.filter((p) => p.status === "draft").length;
  if (canon.length !== drafts.length - draftCount)
    fail(`draft filter leaked: ${canon.length} visible without ?drafts=1`);
  else ok(`draft filter holds, ${draftCount} drafts hidden without ?drafts=1`);

  // 5. Plate containment.
  for (const p of drafts) {
    if (!resolveVaultPath(root, p.plate))
      fail(`${p.id} plate escapes the allowlisted roots: ${p.plate}`);
  }
  ok("every plate path stays inside the vault or the wall");
} catch (err) {
  fail(`pages: ${(err as Error).message}`);
}

// 3. The refusal itself, proven in memory so no vault file is edited.
const withPlate = [
  "---",
  "id: check-fixture",
  "type: place",
  "title: Fixture",
  "world: quiet-practice",
  "plate: ../self/wall/plates/04-twilight-shrine-a4dcc6c7.jpg",
  "status: draft",
  "---",
  "",
  "body",
].join("\n");
const withoutPlate = withPlate
  .split("\n")
  .filter((l) => !l.startsWith("plate:"))
  .join("\n");

try {
  parsePage(withPlate, "fixture.md", () => true);
  ok("a page with a plate parses");
} catch (err) {
  fail(`a page with a plate should parse: ${(err as Error).message}`);
}

try {
  parsePage(withoutPlate, "fixture.md", () => true);
  fail("a page with NO plate parsed; the reader must throw");
} catch (err) {
  if (err instanceof VaultError) ok("a page with no plate throws");
  else fail(`wrong error type for a plateless page: ${(err as Error).name}`);
}

try {
  parsePage(withPlate, "fixture.md", () => false);
  fail("a page whose plate is absent parsed; the reader must throw");
} catch (err) {
  if (err instanceof VaultError) ok("a page whose plate file is absent throws");
  else fail(`wrong error type for an absent plate: ${(err as Error).name}`);
}

// 6. The layout contract (round two). Every manifest is emitted and checked, so
// a world.yml with a room that nothing can reach, a door to nowhere, or two
// biomes sitting on top of each other fails here rather than on screen.
try {
  const manifests = readAllManifests({ drafts: true }, root);
  const worldIds = new Set(manifests.map((m) => m.id));
  if (manifests.length === 0) fail("no manifests emitted");
  else ok(`${manifests.length} manifests emit`);

  for (const m of manifests) {
    const roomIds = new Set<string>();
    for (const r of m.layout.rooms) {
      if (roomIds.has(r.id)) fail(`${m.id}: two rooms share the id ${r.id}`);
      roomIds.add(r.id);
    }
    // Room.objects must never dangle: the scene looks every id up.
    const objectIds = new Set(m.objects.map((o) => o.id));
    for (const r of m.layout.rooms) {
      for (const id of r.objects) {
        if (!objectIds.has(id)) fail(`${m.id}/${r.id}: object id ${id} is in no manifest`);
      }
      for (const d of r.doors) {
        if (!roomIds.has(d.to) && !worldIds.has(d.to))
          fail(`${m.id}/${r.id}: door leads to ${d.to}, which is neither a room nor a world`);
      }
    }
    for (const o of m.objects) {
      if (!roomIds.has(o.room)) fail(`${m.id}: ${o.id} stands in room ${o.room}, which does not exist`);
    }
    // Monuments are the forge's, and only the forge's (Critic round one, 3).
    if (m.id !== "forge" && m.monuments.length)
      fail(`${m.id} carries ${m.monuments.length} monuments; they belong to the forge`);
  }
  ok("every room id is unique, every object is in a real room, no door leads nowhere");

  // Biomes must not overlap: the scene finds the world at a point by testing
  // these rectangles, so two worlds sharing ground means one is unreachable.
  for (let i = 0; i < manifests.length; i++) {
    for (let j = i + 1; j < manifests.length; j++) {
      const a = manifests[i].layout;
      const b = manifests[j].layout;
      const overlapX = Math.abs(a.origin.x - b.origin.x) < (a.size.w + b.size.w) / 2;
      const overlapZ = Math.abs(a.origin.z - b.origin.z) < (a.size.d + b.size.d) / 2;
      if (overlapX && overlapZ)
        fail(`${manifests[i].id} and ${manifests[j].id} sit on the same ground`);
    }
  }
  ok("no two biomes sit on the same ground");

  const forge = manifests.find((m) => m.id === "forge");
  if (forge && forge.monuments.length) {
    const dates = forge.monuments.map((m) => m.date);
    const sorted = [...dates].sort();
    if (dates.join("|") !== sorted.join("|")) fail("forge monuments are not in date order");
    else ok(`${dates.length} monuments stand in the forge, in date order`);
  }

  // Props: a closed vocabulary, so a typo is a refused commit and not a prop
  // that silently never stands anywhere (the Critic's deduction 5: rooms were
  // furnished from English words inside their ids).
  let propFailures = 0;
  let propCount = 0;
  let roomsWithProps = 0;
  for (const w of readWorlds(root)) {
    const raw = readLayoutBlock(w.worldFile, root) as
      | { rooms?: unknown }
      | null;
    const rooms = raw && typeof raw === "object" ? raw.rooms : null;
    const entries = Array.isArray(rooms)
      ? rooms
      : rooms && typeof rooms === "object"
        ? Object.values(rooms)
        : [];
    for (const r of entries as Record<string, unknown>[]) {
      const props = Array.isArray(r?.props) ? r.props : [];
      if (props.length) roomsWithProps++;
      for (const prop of props) {
        propCount++;
        if (!isProp(prop))
          {
            fail(`${w.id}/${String(r?.id)}: prop "${String(prop)}" is not in the SCHEMA.md vocabulary`);
            propFailures++;
          }
      }
    }
  }
  if (propFailures === 0)
    ok(`${propCount} props in ${roomsWithProps} rooms, all ${PROPS.length} words known`);

  // Every room that is furnished at all must be furnished by the vault, not by
  // the scene guessing from an id.
  for (const m of manifests) {
    const furnished = m.layout.rooms.filter((r) => r.props.length).length;
    if (furnished === 0) fail(`${m.id}: no room names a single prop`);
  }

  // A monument must be openable: it is emitted in `objects` as well as in
  // `monuments`, so dwell and E find it (deduction 6).
  const forgeM = manifests.find((m) => m.id === "forge");
  if (forgeM) {
    const ids = new Set(forgeM.objects.filter((o) => o.type === "monument").map((o) => o.id));
    const missing = forgeM.monuments.filter((m) => !ids.has(m.id));
    if (missing.length) fail(`forge: ${missing.length} monuments are in no objects list`);
    else ok(`${forgeM.monuments.length} monuments are also objects, so a stone unfolds`);
  }

  // Figures stand somewhere. PG: "Maygan and everyone else are party members."
  const figures = manifests.flatMap((m) => m.objects.filter((o) => o.type === "figure"));
  if (figures.length === 0) fail("no figure is placed in any world");
  else ok(`${figures.length} figure(s) placed: ${figures.map((f) => f.id).join(", ")}`);

  // Cards are a size fix, not a contract: report, never fail. Counted separately
  // rather than as a ratio, because a page can lose its plate and keep the card
  // that was cut from it, and "14 of 13" is a line that helps nobody.
  const all = manifests.flatMap((m) => m.objects).filter((o) => o.type !== "monument");
  ok(
    `${all.filter((o) => o.plate).length} objects carry a full plate, ` +
      `${all.filter((o) => o.card).length} carry a 256 px card, of ${all.length}`,
  );

  // BACKDROP IS NOT THE IDENTITY PLATE (round 2.1). Every world names one, every
  // one of them resolves to a file on disk, and the quiet practice's is not the
  // flute plate: as the horizon behind the walker that was a second traveller.
  const registry = readWorlds(root);
  for (const w of registry) {
    if (!w.backdrop) {
      fail(`${w.id}: no backdrop: in world.yml`);
      continue;
    }
    const abs = resolveVaultPath(root, w.backdrop)?.abs;
    if (!abs || !fs.existsSync(abs)) fail(`${w.id}: backdrop ${w.backdrop} is not on disk`);
  }
  const practice = registry.find((w) => w.id === "quiet-practice");
  if (practice && practice.backdrop === practice.heroPlate) {
    fail("quiet-practice: backdrop and hero_plate are the same picture");
  } else if (registry.every((w) => w.backdrop)) {
    ok(`${registry.length} worlds name a backdrop, all on disk, none the flute plate`);
  }
  for (const m of manifests) {
    if (!m.backdrop?.url) fail(`${m.id}: the manifest carries no backdrop url`);
  }

  // CUTOUTS ARE LISTED, NOT PROBED. Every word the reader emits is a known prop
  // with a file on disk, so the scene asks for exactly these and spends no
  // console 404 finding out what the painter has not painted yet.
  let cutoutWords = 0;
  for (const m of manifests) {
    for (const word of m.cutouts) {
      cutoutWords++;
      if (!isProp(word)) fail(`${m.id}: cutout "${word}" is not in the props vocabulary`);
      if (!fs.existsSync(path.join(root, "worlds", m.id, "cutouts", `${word}.png`)))
        fail(`${m.id}: cutout "${word}" is listed and is not on disk`);
    }
  }
  if (cutoutWords === 0) fail("no world lists a single cutout; the scene will probe with 404s");
  else ok(`${cutoutWords} cutouts listed across ${manifests.filter((m) => m.cutouts.length).length} worlds`);

  // The hall's interior painting is vault data now, not a map in the renderer.
  const hall = manifests
    .flatMap((m) => m.layout.rooms)
    .find((r) => r.id === "shrine-hall");
  if (!hall) fail("no shrine-hall room in any manifest");
  else if (!hall.interior) fail("shrine-hall carries no interior:");
  else if (!hall.interior.startsWith("/api/cosmos/asset/"))
    fail(`shrine-hall interior is not an asset url: ${hall.interior}`);
  else ok("shrine-hall names its interior painting, as an asset url");

  const thread = manifests[0]?.thread;
  if (!thread?.season) fail("the thread carries no season");
  else ok(`the thread reads season ${thread.season}, chapter ${thread.chapter?.id ?? "(none)"}`);
} catch (err) {
  fail(`layout: ${(err as Error).message}`);
}

console.log(failures === 0 ? "\nvault check passed" : `\nvault check FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
