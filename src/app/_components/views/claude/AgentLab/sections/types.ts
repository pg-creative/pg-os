/**
 * Shared types + helpers for section-by-section variants.
 *
 * Per ~/.claude/skills/design-lab/SKILL.md Phase 3: each section has 4 variants
 * (3 distinct interpretations of locked DNA + 1 mandatory falsifier). PG iterates
 * one section at a time. Lab shows ?section=<name>&variant=<1..4>.
 */

import type { AgentSnapshot } from "../useAgentStream";

// ---------- Section identity ----------

export type SectionId = "character" | "environment" | "activity" | "focus";

export const SECTION_ORDER: SectionId[] = [
  "character",
  "environment",
  "activity",
  "focus",
];

export interface SectionMeta {
  id: SectionId;
  label: string;
  question: string; // "which character treatment feels like ME?"
  variants: VariantMeta[];
}

export interface VariantMeta {
  id: string;
  label: string;
  description: string;
  isFalsifier?: boolean;
}

// ---------- Per-section variant types ----------

export type CharacterVariant =
  | "mj-portrait" // Howl's-style painted portrait, uses MJ asset (Phase 2.5)
  | "hd2d-sprite" // Octopath HD-2D pixel sprite, CSS-art placeholder
  | "thought-card" // Disco Elysium bookplate frame, painted-card
  | "glow-orb"; // FALSIFIER — abstract glowing orb, no figure at all

export type EnvironmentVariant =
  | "atelier" // Howl's library interior, uses MJ asset
  | "camp" // Wayfarer campfire scene, uses MJ asset
  | "guild" // Adventurer's guild hall, uses MJ asset
  | "void"; // FALSIFIER — no environment, just warm cream

export type ActivityVariant =
  | "prop-hand" // Tool icon as if held by character (book/quill/hammer)
  | "color-tint" // Hades-style character tint shift per state
  | "kinetic-label" // Persona 5 floating text bubble
  | "status-stack"; // FALSIFIER — corner JRPG icon stack (less expressive but informative)

export type FocusVariant =
  | "drawer" // Right-slide drawer (default)
  | "modal" // Full-page focus mode (cinematic)
  | "flyout" // Anchored contextual flyout (VS Code peek)
  | "inline-expand"; // FALSIFIER — character card expands in place, no overlay

// ---------- Section metadata (drives the lab nav) ----------

export const SECTIONS: Record<SectionId, SectionMeta> = {
  character: {
    id: "character",
    label: "Character",
    question: "which character treatment feels like ME?",
    variants: [
      {
        id: "mj-portrait",
        label: "MJ Portrait",
        description:
          "Howl's-style painted portrait. Uses Phase 2.5 Midjourney asset (falls back to CSS placeholder until MJ runs).",
      },
      {
        id: "hd2d-sprite",
        label: "HD-2D Sprite",
        description: "Octopath Traveler pixel sprite, crisp dithered shading.",
      },
      {
        id: "thought-card",
        label: "Thought Card",
        description:
          "Disco Elysium bookplate frame, painted card with brackets.",
      },
      {
        id: "glow-orb",
        label: "Glow Orb (falsifier)",
        description:
          "Abstract glowing orb — no figure at all. Tests whether the character figure matters.",
        isFalsifier: true,
      },
    ],
  },
  environment: {
    id: "environment",
    label: "Environment",
    question: "where do the characters live?",
    variants: [
      {
        id: "atelier",
        label: "Atelier",
        description: "Howl's library interior at golden hour. MJ asset.",
      },
      {
        id: "camp",
        label: "Camp",
        description: "Wayfarer campfire scene at dusk. MJ asset.",
      },
      {
        id: "guild",
        label: "Guild Hall",
        description: "Adventurer's guild hall warm interior. MJ asset.",
      },
      {
        id: "void",
        label: "Void (falsifier)",
        description:
          "No environment, just warm cream. Tests whether the world matters.",
        isFalsifier: true,
      },
    ],
  },
  activity: {
    id: "activity",
    label: "Activity",
    question: "how do you SEE what an agent is doing?",
    variants: [
      {
        id: "prop-hand",
        label: "Prop in Hand",
        description: "Tool icon as held object (book/quill/hammer).",
      },
      {
        id: "color-tint",
        label: "Color Tint",
        description: "Hades-style character tint shifts per state.",
      },
      {
        id: "kinetic-label",
        label: "Kinetic Label",
        description: "Persona 5 floating text bubble above character.",
      },
      {
        id: "status-stack",
        label: "Status Stack (falsifier)",
        description:
          "Corner JRPG icon stack — informative but less character-expressive.",
        isFalsifier: true,
      },
    ],
  },
  focus: {
    id: "focus",
    label: "Focus Action",
    question: "what happens when you click a character?",
    variants: [
      {
        id: "drawer",
        label: "Side Drawer",
        description: "Right-slide drawer with tool history + ghostty link.",
      },
      {
        id: "modal",
        label: "Modal Focus",
        description: "Full-page cinematic focus mode.",
      },
      {
        id: "flyout",
        label: "Anchored Flyout",
        description: "VS Code peek-definition style anchored panel.",
      },
      {
        id: "inline-expand",
        label: "Inline Expand (falsifier)",
        description:
          "Character card expands in place — no overlay, no dismiss needed.",
        isFalsifier: true,
      },
    ],
  },
};

// ---------- Asset resolver (Phase 2.5 handoff) ----------

/**
 * Returns the public URL for a MJ-generated asset. If the file is missing,
 * the consuming component should show a CSS placeholder via onError.
 *
 * Convention: /agent-office/{section}/{slug}.png
 *   e.g. /agent-office/characters/wayfarer.png
 *        /agent-office/environments/atelier.png
 */
export function assetUrl(
  section: "characters" | "environments",
  slug: string,
): string {
  return `/agent-office/${section}/${slug}.png`;
}

// ---------- Character class → MJ portrait slug mapping ----------

// Auto-derive which character portrait to use based on the agent's tool usage profile.
import type { CharacterClass } from "../primitives";

export const CLASS_TO_PORTRAIT_SLUG: Record<CharacterClass, string> = {
  scribe: "scribe",
  ranger: "ranger",
  smith: "smith",
  scout: "ranger", // scouts use ranger portrait
  sage: "sage",
  wanderer: "wayfarer", // default to wayfarer for unspecialized
};

// ---------- localStorage keys (PG's picks persist across visits) ----------

export const PICK_KEY = (section: SectionId) => `agentLab.pick.${section}`;

export function loadPick<T extends string>(section: SectionId, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(PICK_KEY(section));
    return (stored as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function savePick(section: SectionId, variantId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PICK_KEY(section), variantId);
  } catch {
    /* ignore quota */
  }
}

// ---------- Re-export AgentSnapshot for convenience ----------
export type { AgentSnapshot };
