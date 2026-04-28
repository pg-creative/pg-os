/**
 * Chest economy — coins, chests, rewards, pulls.
 *
 * Coin source: profiles.season_coins (already exists). Earned via
 * awardCoinsForCompletion(actualXP) → floor(actualXP / 10), called from
 * src/app/api/habits/route.ts after recordCompletion.
 *
 * Pulls live in chest_pulls (id, user_id, pulled_at, chest_type,
 * reward_type, reward_payload jsonb, cost_coins, opened_at).
 *
 * Reward generation is deterministic-but-shuffled — seeded from
 * pulled_at_ms ^ user_id_hash so we can audit a pull after the fact.
 *
 * NOTE: hcClient() is the HC supabase service-role client (used by habits.ts
 * already). chest_pulls and profiles.* live in HC's database.
 */
import { hcClient, getUserId } from "./hcSupabase";
import { getCosmeticCatalog, type AvatarState, type CosmeticSlot } from "./avatar";

// ---------- Types ----------

export type ChestType = "wood" | "silver" | "gold" | "crystal";

export type ChestRarity = "common" | "uncommon" | "rare" | "legendary";

export type ChestRewardType = "cosmetic" | "xp_bonus" | "lore" | "coins";

export interface ChestReward {
  type: ChestRewardType;
  rarity: ChestRarity;
  /** Short label PG sees on reveal — "Mossleaf Hat", "+25 XP next ship", etc. */
  label: string;
  /** Optional flavour text, shown small on reveal. */
  flavour?: string;
  /** Specific cosmetic slot if type === 'cosmetic'. */
  slot?: CosmeticSlot;
  /** Cosmetic key (matches catalog) if type === 'cosmetic'. */
  cosmeticKey?: string;
  /** Numeric XP bonus if type === 'xp_bonus'. */
  xp?: number;
  /** Coin amount if type === 'coins'. */
  coins?: number;
}

export interface Chest {
  type: ChestType;
  name: string;
  costCoins: number;
  rarity: ChestRarity;
  /** Tooltip-able description for the card. */
  description: string;
  /** Min season tier required ('F' = always available, 'S' = locked until S+). */
  unlockTier: "F" | "D" | "C" | "B" | "A" | "S" | "SSS";
}

export interface ChestPullResult {
  pullId: string;
  chestType: ChestType;
  reward: ChestReward;
  /** ISO timestamp. */
  pulledAt: string;
  /** Coins remaining after deduction. */
  coinsAfter: number;
  /** Has this been "opened" yet? false until openChest is called. */
  opened: boolean;
}

// ---------- Catalog ----------

const CHEST_CATALOG: Chest[] = [
  {
    type: "wood",
    name: "Wooden Chest",
    costCoins: 50,
    rarity: "common",
    description: "Brass-banded oak. Mostly common cosmetics, the occasional uncommon.",
    unlockTier: "F",
  },
  {
    type: "silver",
    name: "Silver Chest",
    costCoins: 200,
    rarity: "uncommon",
    description: "Cool moonlit silver. Common + uncommon, leaning uncommon.",
    unlockTier: "F",
  },
  {
    type: "gold",
    name: "Golden Chest",
    costCoins: 500,
    rarity: "rare",
    description: "Glowing amber gold. Uncommon + rare cosmetics, possible XP boons.",
    unlockTier: "F",
  },
  {
    type: "crystal",
    name: "Crystal Chest",
    costCoins: 1500,
    rarity: "legendary",
    description: "Refracts golden hour through facets. Rare + legendary. Locked until S tier.",
    unlockTier: "S",
  },
];

export function getChestCatalog(): Chest[] {
  return CHEST_CATALOG.map((c) => ({ ...c }));
}

export function getChest(type: ChestType): Chest | null {
  return CHEST_CATALOG.find((c) => c.type === type) ?? null;
}

// ---------- Coin balance ----------

export async function getCoinsBalance(): Promise<number> {
  const c = hcClient();
  if (!c) return 0;
  const userId = await getUserId();
  if (!userId) return 0;
  const { data } = await c.from("profiles").select("season_coins").eq("id", userId).maybeSingle();
  return (data?.season_coins as number | null) ?? 0;
}

/**
 * Increment coins by floor(actualXP / 10). Called after every habit completion.
 * Best-effort: errors are swallowed (coin minting must never break habit logging).
 */
export async function awardCoinsForCompletion(actualXP: number): Promise<number> {
  const c = hcClient();
  if (!c) return 0;
  const userId = await getUserId();
  if (!userId) return 0;
  const delta = Math.max(0, Math.floor(actualXP / 10));
  if (delta === 0) return 0;
  try {
    const { data: cur } = await c.from("profiles").select("season_coins").eq("id", userId).maybeSingle();
    const before = (cur?.season_coins as number | null) ?? 0;
    const after = before + delta;
    await c.from("profiles").update({ season_coins: after }).eq("id", userId);
    return delta;
  } catch {
    return 0;
  }
}

// ---------- Daily pull cap ----------

const DAILY_PULL_CAP = 5;

async function pullsToday(userId: string): Promise<number> {
  const c = hcClient();
  if (!c) return 0;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count } = await c
    .from("chest_pulls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("pulled_at", startOfDay.toISOString());
  return count ?? 0;
}

// ---------- Deterministic-but-shuffled RNG ----------

/** Tiny xmur3 string hash → 32-bit seed. */
function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

/** mulberry32 PRNG, seeded so we can replay any pull. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Reward tables ----------

interface RewardWeight {
  rarity: ChestRarity;
  weight: number;
}

const CHEST_RARITY_TABLE: Record<ChestType, RewardWeight[]> = {
  wood: [
    { rarity: "common", weight: 80 },
    { rarity: "uncommon", weight: 18 },
    { rarity: "rare", weight: 2 },
  ],
  silver: [
    { rarity: "common", weight: 45 },
    { rarity: "uncommon", weight: 50 },
    { rarity: "rare", weight: 5 },
  ],
  gold: [
    { rarity: "uncommon", weight: 55 },
    { rarity: "rare", weight: 40 },
    { rarity: "legendary", weight: 5 },
  ],
  crystal: [
    { rarity: "rare", weight: 60 },
    { rarity: "legendary", weight: 40 },
  ],
};

/** Reward type weights — within a rarity, what kind of reward? */
const REWARD_TYPE_TABLE: Record<ChestRarity, Array<{ type: ChestRewardType; weight: number }>> = {
  common: [
    { type: "cosmetic", weight: 50 },
    { type: "coins", weight: 30 },
    { type: "lore", weight: 20 },
  ],
  uncommon: [
    { type: "cosmetic", weight: 60 },
    { type: "xp_bonus", weight: 25 },
    { type: "lore", weight: 15 },
  ],
  rare: [
    { type: "cosmetic", weight: 70 },
    { type: "xp_bonus", weight: 25 },
    { type: "lore", weight: 5 },
  ],
  legendary: [
    { type: "cosmetic", weight: 85 },
    { type: "xp_bonus", weight: 15 },
  ],
};

const LORE_FRAGMENTS: Record<ChestRarity, string[]> = {
  common: [
    "A mossy note: 'The kodama keep small fires going on cold mornings.'",
    "A torn page: 'Walk slow. The lanterns will catch up.'",
    "Damp parchment: 'Soot sprites only steal what is forgotten.'",
  ],
  uncommon: [
    "A copper coin worn smooth: 'For the ferryman, when you finally cross.'",
    "A pressed leaf: 'The forest remembers everyone who returns.'",
  ],
  rare: [
    "A silver feather: 'Spoken to the wind, a wish becomes a path.'",
    "A glass shard: 'Golden hour is the world admitting it loves you.'",
  ],
  legendary: [
    "A crystal seed: 'The soul-being is not given. It is recognized.'",
  ],
};

function pickWeighted<T extends { weight: number }>(rng: () => number, table: T[]): T {
  const total = table.reduce((s, t) => s + t.weight, 0);
  let r = rng() * total;
  for (const t of table) {
    if (r < t.weight) return t;
    r -= t.weight;
  }
  return table[table.length - 1]!;
}

function generateReward(chestType: ChestType, seedKey: string): ChestReward {
  const rng = mulberry32(hashSeed(seedKey));
  const rarity = pickWeighted(rng, CHEST_RARITY_TABLE[chestType]).rarity;
  const rewardType = pickWeighted(rng, REWARD_TYPE_TABLE[rarity]).type;

  if (rewardType === "cosmetic") {
    const all = getCosmeticCatalog().filter((c) => c.rarity === rarity);
    if (all.length === 0) {
      // Fall through to coins if rarity-cosmetic mismatch.
      const coins = 25 + Math.floor(rng() * 50);
      return { type: "coins", rarity, label: `+${coins} coins`, coins };
    }
    const pick = all[Math.floor(rng() * all.length)]!;
    return {
      type: "cosmetic",
      rarity,
      label: pick.label,
      flavour: pick.flavour,
      slot: pick.slot,
      cosmeticKey: pick.key,
    };
  }

  if (rewardType === "xp_bonus") {
    const xp = rarity === "legendary" ? 250 : rarity === "rare" ? 100 : rarity === "uncommon" ? 50 : 25;
    return {
      type: "xp_bonus",
      rarity,
      label: `+${xp} XP boost`,
      flavour: "Banked. Applied to your next ship.",
      xp,
    };
  }

  if (rewardType === "coins") {
    const coins = rarity === "rare" ? 200 : rarity === "uncommon" ? 75 : 25;
    return { type: "coins", rarity, label: `+${coins} coins`, coins };
  }

  // lore
  const fragments = LORE_FRAGMENTS[rarity];
  const text = fragments[Math.floor(rng() * fragments.length)]!;
  return {
    type: "lore",
    rarity,
    label: "A fragment",
    flavour: text,
  };
}

// ---------- Pull / open ----------

export async function pullChest(chestType: ChestType): Promise<ChestPullResult> {
  const c = hcClient();
  if (!c) throw new Error("hc_not_connected");
  const userId = await getUserId();
  if (!userId) throw new Error("user_id_not_resolved");

  const chest = getChest(chestType);
  if (!chest) throw new Error("unknown_chest_type");

  // Daily cap
  const today = await pullsToday(userId);
  if (today >= DAILY_PULL_CAP) {
    throw new Error("daily_cap_reached");
  }

  // Coins
  const balance = await getCoinsBalance();
  if (balance < chest.costCoins) throw new Error("insufficient_coins");

  // Deduct first (best-effort transactional — single user, low contention).
  const newBalance = balance - chest.costCoins;
  const { error: updErr } = await c.from("profiles").update({ season_coins: newBalance }).eq("id", userId);
  if (updErr) throw updErr;

  const pulledAt = new Date();
  const seedKey = `${pulledAt.getTime()}:${userId}:${chestType}`;
  const reward = generateReward(chestType, seedKey);

  const { data: row, error: insErr } = await c
    .from("chest_pulls")
    .insert({
      user_id: userId,
      pulled_at: pulledAt.toISOString(),
      chest_type: chestType,
      reward_type: reward.type,
      reward_payload: reward as unknown as Record<string, unknown>,
      cost_coins: chest.costCoins,
    })
    .select("id")
    .single();
  if (insErr) {
    // Refund on insert failure.
    await c.from("profiles").update({ season_coins: balance }).eq("id", userId);
    throw insErr;
  }

  return {
    pullId: row.id as string,
    chestType,
    reward,
    pulledAt: pulledAt.toISOString(),
    coinsAfter: newBalance,
    opened: false,
  };
}

export async function openChest(pullId: string): Promise<ChestReward> {
  const c = hcClient();
  if (!c) throw new Error("hc_not_connected");
  const userId = await getUserId();
  if (!userId) throw new Error("user_id_not_resolved");

  const { data: pull, error } = await c
    .from("chest_pulls")
    .select("id, reward_type, reward_payload, opened_at")
    .eq("id", pullId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!pull) throw new Error("pull_not_found");

  const reward = pull.reward_payload as ChestReward;

  // Idempotent open.
  if (!pull.opened_at) {
    await c.from("chest_pulls").update({ opened_at: new Date().toISOString() }).eq("id", pullId);
  }

  // Apply side effects.
  if (reward.type === "cosmetic" && reward.slot && reward.cosmeticKey) {
    // Append to avatar_state.owned[slot]
    const { data: profile } = await c
      .from("profiles")
      .select("avatar_state")
      .eq("id", userId)
      .maybeSingle();
    const state = ((profile?.avatar_state as AvatarState | null) ?? {}) as AvatarState;
    const owned = state.owned ?? {};
    const slotOwned = new Set(owned[reward.slot] ?? []);
    slotOwned.add(reward.cosmeticKey);
    const next: AvatarState = {
      ...state,
      owned: { ...owned, [reward.slot]: Array.from(slotOwned) },
    };
    await c.from("profiles").update({ avatar_state: next }).eq("id", userId);
  } else if (reward.type === "coins" && reward.coins) {
    const { data: cur } = await c.from("profiles").select("season_coins").eq("id", userId).maybeSingle();
    const before = (cur?.season_coins as number | null) ?? 0;
    await c.from("profiles").update({ season_coins: before + reward.coins }).eq("id", userId);
  } else if (reward.type === "xp_bonus" && reward.xp) {
    // Park bonus in avatar_state.xpBank for now — Phase 4 wires it to ships.
    const { data: profile } = await c.from("profiles").select("avatar_state").eq("id", userId).maybeSingle();
    const state = ((profile?.avatar_state as AvatarState | null) ?? {}) as AvatarState;
    const next: AvatarState = { ...state, xpBank: (state.xpBank ?? 0) + reward.xp };
    await c.from("profiles").update({ avatar_state: next }).eq("id", userId);
  }
  // lore is just persisted in chest_pulls — no other side effects.

  return reward;
}

/** Recent pulls — default 10. */
export async function getRecentPulls(limit = 10): Promise<ChestPullResult[]> {
  const c = hcClient();
  if (!c) return [];
  const userId = await getUserId();
  if (!userId) return [];
  const { data } = await c
    .from("chest_pulls")
    .select("id, pulled_at, chest_type, reward_payload, cost_coins, opened_at")
    .eq("user_id", userId)
    .order("pulled_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Array<{
    id: string;
    pulled_at: string;
    chest_type: ChestType;
    reward_payload: ChestReward;
    cost_coins: number;
    opened_at: string | null;
  }>).map((row) => ({
    pullId: row.id,
    chestType: row.chest_type,
    reward: row.reward_payload,
    pulledAt: row.pulled_at,
    coinsAfter: 0, // not authoritative for history view
    opened: !!row.opened_at,
  }));
}

export async function getDailyPullStatus(): Promise<{ used: number; cap: number }> {
  const userId = await getUserId();
  if (!userId) return { used: 0, cap: DAILY_PULL_CAP };
  const used = await pullsToday(userId);
  return { used, cap: DAILY_PULL_CAP };
}
