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
  parsePage,
  parseWorldsYml,
  readPages,
  readWorlds,
  resolveVaultPath,
  sceneForRegister,
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

  if (qp?.phase !== "twilight")
    fail(`round one pins phase to twilight, world.yml says ${qp?.phase}`);
  else ok("phase is pinned to twilight");

  const preset = sceneForRegister(qp?.register ?? null);
  if (!preset.sky.top) fail("register maps to no scene preset");
  else ok(`register ${qp?.register} maps to a scene preset`);
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

console.log(failures === 0 ? "\nvault check passed" : `\nvault check FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
