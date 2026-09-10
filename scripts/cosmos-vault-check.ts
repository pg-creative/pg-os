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
import { EMITTER_PROP } from "../src/lib/cosmos/registers.ts";
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
  // Round three adds `night-when-on`, the party's rule as data. Every world's
  // phase is checked, not just the practice's: an unknown word used to fall
  // silently through to `clock`.
  const PHASES = ["day", "twilight", "midnight", "night", "clock", "night-when-on", null];
  let phaseFailures = 0;
  for (const w of merged) {
    if (!PHASES.includes(w.phase ?? null)) {
      fail(`${w.id}: phase is "${w.phase}", which is not one of ${PHASES.join(", ")}`);
      phaseFailures++;
    }
  }
  if (phaseFailures === 0)
    ok(`every phase is known (quiet-practice ${qp?.phase ?? "unset (follows the clock)"})`);

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

  // ONE ENTRY IS ONE PROP. The reader must never expand a list: the Critic's
  // deduction 4 was three `pine` entries in the vault becoming twenty-seven
  // pines on screen, a hedge across the hall's doorstep that stalled five walks.
  // The renderer owns what a word looks like and not how many there are, so the
  // manifest's array must be exactly the yml's, word for word.
  for (const w of readWorlds(root)) {
    const raw = readLayoutBlock(w.worldFile, root) as { rooms?: unknown } | null;
    const rooms = raw && typeof raw === "object" ? raw.rooms : null;
    const entries = Array.isArray(rooms)
      ? rooms
      : rooms && typeof rooms === "object"
        ? Object.values(rooms)
        : [];
    const manifest = manifests.find((m) => m.id === w.id);
    for (const r of entries as Record<string, unknown>[]) {
      const declared = (Array.isArray(r?.props) ? r.props : []).filter(isProp);
      const emitted = manifest?.layout.rooms.find((x) => x.id === r.id)?.props ?? [];
      if (declared.join("|") !== emitted.join("|"))
        fail(
          `${w.id}/${String(r?.id)}: props were expanded. yml ${declared.length}, manifest ${emitted.length}`,
        );
    }
  }
  {
    const counted = manifests
      .flatMap((m) => m.layout.rooms.flatMap((r) => r.props))
      .reduce<Record<string, number>>((acc, p) => ({ ...acc, [p]: (acc[p] ?? 0) + 1 }), {});
    const pines = counted.pine ?? 0;
    ok(
      `props are literal: ${pines} pine, ${counted["stone-lantern"] ?? 0} stone-lantern, ` +
        `${counted["paper-window"] ?? 0} paper-window across the cosmos`,
    );
  }

  // EVERY LIGHT IS MOTIVATED BY A THING YOU CAN SEE. The Critic's deduction 8
  // was a scene rule; this is the vault half, and it is the half that can be
  // enforced before anything renders. A light claims one prop from its room's
  // inventory through `EMITTER_PROP` (the same map `_scene/props` re-exports), so
  // two `lantern` lights need two `stone-lantern` entries, and a room that lights
  // a fire with no hearth is a refused commit rather than a flame in mid-air.
  //
  // ONE EXCEPTION, by world, room and emitter, never by a flag anyone can set:
  // the depths' `window` is moonlight through the crypt door's mouth, and a lit
  // paper shoji on the ash is exactly the bug. SCHEMA.md says the same sentence.
  const LAMPLESS_BY_DESIGN = "depths/ashen-hollow/window";
  let litRooms = 0;
  let unasked = 0;
  for (const w of readWorlds(root)) {
    const raw = readLayoutBlock(w.worldFile, root) as { rooms?: unknown } | null;
    const rooms = raw && typeof raw === "object" ? raw.rooms : null;
    const entries = Array.isArray(rooms)
      ? rooms
      : rooms && typeof rooms === "object"
        ? Object.values(rooms)
        : [];
    for (const r of entries as Record<string, unknown>[]) {
      const lights = Array.isArray(r?.lights) ? r.lights : [];
      if (!lights.length) continue;
      // A room with no `props:` at all is still being written; the scene's
      // transitional fallback stands its lamps, so this is not its bug yet.
      const declared = (Array.isArray(r.props) ? r.props : []).filter(isProp);
      if (!declared.length) continue;
      litRooms++;
      const pool = [...declared];
      for (const l of lights as Record<string, unknown>[]) {
        const emitter = typeof l?.emitter === "string" ? l.emitter : String(l?.type ?? "");
        const want = EMITTER_PROP[emitter];
        const where = `${w.id}/${String(r.id)}/${emitter}`;
        if (!want) {
          fail(`${where}: no prop word can ever stand under this emitter`);
          continue;
        }
        const i = pool.indexOf(want);
        if (i >= 0) {
          pool.splice(i, 1);
          continue;
        }
        if (where === LAMPLESS_BY_DESIGN) {
          unasked++;
          continue;
        }
        fail(`${where}: a light with no lamp. Its room's props: name no "${want}"`);
      }
    }
  }
  ok(
    `every light in ${litRooms} furnished rooms has a lamp its room asked for, ` +
      `bar ${unasked} by design (${LAMPLESS_BY_DESIGN})`,
  );

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

  // ── Round three ────────────────────────────────────────────────────────────

  // A ROOM THAT NAMES A LOOP HAS ONE. `loop:` resolves through `frames.json`, so
  // a folder with no manifest file, no frames, or a count of zero comes back null
  // and the room silently stops breathing. That is a refused commit here instead.
  let loops = 0;
  for (const w of readWorlds(root)) {
    const raw = readLayoutBlock(w.worldFile, root) as { rooms?: unknown } | null;
    const rooms = raw && typeof raw === "object" ? raw.rooms : null;
    const entries = Array.isArray(rooms)
      ? rooms
      : rooms && typeof rooms === "object"
        ? Object.values(rooms)
        : [];
    for (const r of entries as Record<string, unknown>[]) {
      if (typeof r?.loop !== "string") continue;
      const room = manifests
        .find((m) => m.id === w.id)
        ?.layout.rooms.find((x) => x.id === r.id);
      if (!room?.loop) {
        fail(`${w.id}/${String(r.id)}: loop "${r.loop}" has no readable frames.json`);
        continue;
      }
      loops++;
      const dir = path.join(root, "worlds", w.id, r.loop);
      const last = `frame-${String(room.loop.count).padStart(3, "0")}.webp`;
      if (!fs.existsSync(path.join(dir, last)))
        fail(`${w.id}/${String(r.id)}: frames.json says ${room.loop.count} frames and ${last} is missing`);
      if (!room.loop.base.startsWith("/api/cosmos/asset/"))
        fail(`${w.id}/${String(r.id)}: loop base is not an asset url: ${room.loop.base}`);
    }
  }
  if (loops === 0) fail("no room names a loop; the two Higgsfield loops are wired to nothing");
  else ok(`${loops} room loop(s) resolve, every frame the count promises is on disk`);

  // A ROOM'S BED IS A FILE, not a marker and not a hope.
  for (const m of manifests) {
    for (const r of m.layout.rooms) {
      if (!r.bed) continue;
      if (!r.bed.startsWith("/api/cosmos/asset/"))
        fail(`${m.id}/${r.id}: bed is not an asset url: ${r.bed}`);
    }
  }

  // THE HERO MODEL. One world offers one, it is on disk, and its clip is named:
  // a mistyped clip is a hero standing in an A-pose with no error anywhere.
  const withModel = readWorlds(root).filter((w) => w.model);
  if (withModel.length === 0) fail("no world names a `model:`");
  for (const w of withModel) {
    const m = manifests.find((x) => x.id === w.id);
    if (!m?.hero_model) {
      fail(`${w.id}: model ${w.model} does not resolve to a file on disk`);
      continue;
    }
    if (!m.hero_model.clip) fail(`${w.id}: model names no clip`);
    if (!m.hero_model.static_url) fail(`${w.id}: model_static does not resolve`);
    if (!(m.hero_model.height > 0)) fail(`${w.id}: model height is ${m.hero_model.height}`);
    ok(`${w.id}: hero model resolves (${m.hero_model.height} m, clip ${m.hero_model.clip})`);
  }

  // THE WEATHER SENTENCE HAS NO NUMBERS IN IT. The Critic's deduction 6 was a
  // count spelled out ("eight days since the pages"), so a word list is not
  // enough on its own: the three words are checked for digits AND for the
  // spelled numbers the HUD used to reach for.
  const SPELLED = /\b(no|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|many)\b/i;
  const words = manifests[0]?.weather?.words;
  if (!words || !words.sky || !words.season || !words.time) {
    fail("the manifest's weather carries no words {sky, season, time}");
  } else {
    const bad = Object.entries(words).filter(
      ([, v]) => /\d/.test(v) || SPELLED.test(v),
    );
    if (bad.length)
      fail(`weather words carry a count: ${bad.map(([k, v]) => `${k}="${v}"`).join(", ")}`);
    else ok(`weather words: ${words.sky} / ${words.time} / ${words.season}`);
  }

  // WHAT IS SUPERSEDED GETS DELETED. Both of the Critic's parked files, checked
  // by absence, so a `cut-frames.sh` run or a copied world file cannot quietly
  // put a second home back.
  for (const w of readWorlds(root)) {
    for (const gone of ["hero.webp", "hero-lqip.webp"]) {
      if (fs.existsSync(path.join(root, "worlds", w.id, "plates", gone)))
        fail(`${w.id}: worlds/${w.id}/plates/${gone} is back; nothing reads it (deduction 13)`);
    }
  }
  const stale: string[] = [];
  for (const file of ["worlds.yml", ...readWorlds(root).map((w) => w.worldFile).filter(Boolean)]) {
    const abs = path.join(root, file as string);
    if (!fs.existsSync(abs)) continue;
    for (const line of fs.readFileSync(abs, "utf8").split("\n")) {
      if (/^\s*hero_plate_alt\s*:/.test(line)) stale.push(`${file}: hero_plate_alt`);
      if (/^\s*loop\s*:\s*\.\./.test(line)) stale.push(`${file}: a world-level loop into self/`);
    }
  }
  if (stale.length) fail(`deleted fields are back: ${stale.join(", ")}`);
  else ok("no hero_plate_alt, no hero.webp, no world-level loop: nothing parked");
} catch (err) {
  fail(`layout: ${(err as Error).message}`);
}

console.log(failures === 0 ? "\nvault check passed" : `\nvault check FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
