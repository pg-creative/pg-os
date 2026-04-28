/**
 * Soul-being avatar — state, cosmetic catalog, mutations.
 *
 * State lives in profiles.avatar_state (jsonb, default {}). The shape is open
 * but we lean on a few well-known keys. Cosmetics are referenced by `key`
 * strings that match this catalog. PG owns a cosmetic when its key appears
 * in avatar_state.owned[slot].
 *
 * The aesthetic here: kodama / soot-sprite / Spirited Away. Subtle, poetic,
 * not flashy. Hat options are leaves and brass pins, not crowns and capes.
 */
import { hcClient, getUserId } from "./hcSupabase";

export type CosmeticSlot = "hat" | "aura" | "companion" | "palette";

export type AvatarPalette = "dawn" | "dusk" | "midnight" | "aurora";

export interface AvatarState {
  /** Currently equipped hat key (or null). */
  hat?: string | null;
  /** Currently equipped aura key. Default 'sparkle'. */
  aura?: string | null;
  /** Currently equipped companion key (or null). */
  companion?: string | null;
  /** Color palette token. Default 'dawn'. */
  palette?: AvatarPalette;
  /** Free-text mood, set occasionally (e.g. "tired-but-trying"). */
  mood?: string | null;
  /** What PG owns, by slot — unlocks come from chest pulls. */
  owned?: Partial<Record<CosmeticSlot, string[]>>;
  /** XP bonus pool — applied to next ship in a future phase. */
  xpBank?: number;
}

export interface Cosmetic {
  key: string;
  slot: CosmeticSlot;
  label: string;
  /** Short poetic description. */
  flavour: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
}

const COSMETIC_CATALOG: Cosmetic[] = [
  // Hats — all leafy / brassy / paper / antler. No crowns, no fortnite.
  { key: "mossleaf", slot: "hat", label: "Mossleaf", flavour: "A small green leaf, slightly damp.", rarity: "common" },
  { key: "brass-pin", slot: "hat", label: "Brass Pin", flavour: "Inscribed with a name no one remembers.", rarity: "uncommon" },
  { key: "paper-crane", slot: "hat", label: "Paper Crane", flavour: "Folded by someone who loved you.", rarity: "rare" },
  { key: "antler-crown", slot: "hat", label: "Antler Crown", flavour: "Found in the forest. Yours now.", rarity: "legendary" },

  // Auras — soft glows, not particle storms.
  { key: "sparkle", slot: "aura", label: "Sparkle", flavour: "The default warmth. Always there.", rarity: "common" },
  { key: "ember", slot: "aura", label: "Ember", flavour: "Coal-warm, sunset-orange.", rarity: "common" },
  { key: "frost", slot: "aura", label: "Frost", flavour: "Cool blue, like a quiet morning.", rarity: "uncommon" },
  { key: "moonlight", slot: "aura", label: "Moonlight", flavour: "Pale silver, late-night still.", rarity: "rare" },
  { key: "aurora", slot: "aura", label: "Aurora", flavour: "Green and violet, slowly breathing.", rarity: "legendary" },

  // Companions — small orbiting glyphs.
  { key: "kodama", slot: "companion", label: "Kodama", flavour: "Tiny, pale, head tilts when you finish a habit.", rarity: "uncommon" },
  { key: "soot-sprite", slot: "companion", label: "Soot Sprite", flavour: "Carries small things. Never the heavy ones.", rarity: "rare" },
  { key: "lantern-fox", slot: "companion", label: "Lantern Fox", flavour: "Walks ahead and waits at every turn.", rarity: "legendary" },

  // Palettes — color tokens for the soul-being.
  { key: "dawn", slot: "palette", label: "Dawn", flavour: "Coral and warm cream.", rarity: "common" },
  { key: "dusk", slot: "palette", label: "Dusk", flavour: "Deep amber and indigo.", rarity: "uncommon" },
  { key: "midnight", slot: "palette", label: "Midnight", flavour: "Ink and ember-gold.", rarity: "rare" },
  { key: "aurora", slot: "palette", label: "Aurora Palette", flavour: "Greens, violets, polar.", rarity: "legendary" },
];

export function getCosmeticCatalog(): Cosmetic[] {
  return COSMETIC_CATALOG.map((c) => ({ ...c }));
}

export function getCosmetic(key: string, slot?: CosmeticSlot): Cosmetic | null {
  return COSMETIC_CATALOG.find((c) => c.key === key && (!slot || c.slot === slot)) ?? null;
}

export function defaultAvatarState(): AvatarState {
  return {
    palette: "dawn",
    aura: "sparkle",
    companion: null,
    hat: null,
    mood: null,
    owned: {
      hat: [],
      aura: ["sparkle"], // default aura is owned from the start
      companion: [],
      palette: ["dawn"], // default palette owned from the start
    },
    xpBank: 0,
  };
}

function mergeWithDefault(state: AvatarState | null | undefined): AvatarState {
  const def = defaultAvatarState();
  if (!state) return def;
  return {
    ...def,
    ...state,
    owned: {
      hat: Array.from(new Set([...(def.owned?.hat ?? []), ...(state.owned?.hat ?? [])])),
      aura: Array.from(new Set([...(def.owned?.aura ?? []), ...(state.owned?.aura ?? [])])),
      companion: Array.from(new Set([...(def.owned?.companion ?? []), ...(state.owned?.companion ?? [])])),
      palette: Array.from(new Set([...(def.owned?.palette ?? []), ...(state.owned?.palette ?? [])])),
    },
  };
}

export async function getAvatarState(): Promise<AvatarState> {
  const c = hcClient();
  if (!c) return defaultAvatarState();
  const userId = await getUserId();
  if (!userId) return defaultAvatarState();
  const { data } = await c
    .from("profiles")
    .select("avatar_state")
    .eq("id", userId)
    .maybeSingle();
  return mergeWithDefault(data?.avatar_state as AvatarState | null);
}

export async function getSoulBeingName(): Promise<string | null> {
  const c = hcClient();
  if (!c) return null;
  const userId = await getUserId();
  if (!userId) return null;
  const { data } = await c
    .from("profiles")
    .select("soul_being_name")
    .eq("id", userId)
    .maybeSingle();
  return (data?.soul_being_name as string | null) ?? null;
}

export async function setSoulBeingName(name: string): Promise<void> {
  const c = hcClient();
  if (!c) throw new Error("hc_not_connected");
  const userId = await getUserId();
  if (!userId) throw new Error("user_id_not_resolved");
  const trimmed = name.trim().slice(0, 48);
  await c.from("profiles").update({ soul_being_name: trimmed || null }).eq("id", userId);
}

/**
 * Update a partial set of avatar fields. Only equippable slots can be set
 * via this helper — adding new owned cosmetics happens through openChest.
 *
 * If a non-owned cosmetic is requested, the change is silently ignored.
 */
export async function updateAvatarState(partial: Partial<AvatarState>): Promise<AvatarState> {
  const c = hcClient();
  if (!c) throw new Error("hc_not_connected");
  const userId = await getUserId();
  if (!userId) throw new Error("user_id_not_resolved");

  const current = await getAvatarState();
  const owned = current.owned ?? {};

  const next: AvatarState = { ...current };

  if (partial.hat !== undefined) {
    if (partial.hat === null || (owned.hat ?? []).includes(partial.hat)) next.hat = partial.hat;
  }
  if (partial.aura !== undefined) {
    if (partial.aura === null || (owned.aura ?? []).includes(partial.aura)) next.aura = partial.aura;
  }
  if (partial.companion !== undefined) {
    if (partial.companion === null || (owned.companion ?? []).includes(partial.companion)) next.companion = partial.companion;
  }
  if (partial.palette !== undefined && partial.palette) {
    if ((owned.palette ?? []).includes(partial.palette)) next.palette = partial.palette;
  }
  if (partial.mood !== undefined) next.mood = partial.mood;

  await c.from("profiles").update({ avatar_state: next }).eq("id", userId);
  return next;
}
