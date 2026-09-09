/**
 * Deterministic fixtures: the world on day one, and the Critic's harness states.
 *
 * FOLLOWS: `test-playable-web-games` ("create seedable fixtures, debug routes, or
 * query parameters ... test important transitions directly rather than grinding
 * through the campaign"). These are not mock data waiting to be thrown away. They
 * are the five review states the harness drives, and they keep the route playable
 * while the keeper's reader is still in flight:
 *
 *   ?fixture=hall           the Wayfarer at the hearth, home base, nothing open
 *   ?fixture=border         standing in the mist between two registers
 *   ?fixture=depth1         below the stairs, paperback, one red moon
 *   ?fixture=unfold         a page already open, with its plate
 *   ?fixture=empty-satchel  nothing ever touched, so every object is full mist
 *
 * Coordinates are one shared ground plane in metres, origin at the shrine hall.
 * Five biomes sit on it at their own origins; the depths sit far to the north of
 * everything, unreachable except down the stair, which is what a depth layer is
 * when the level has one plane (`author-game-levels`).
 */

import type { CosmosManifest, Room, WorldManifest } from "../contract";

const ISO_TODAY = new Date().toISOString();
const ISO_WEEK = new Date(Date.now() - 6 * 86_400_000).toISOString();

function room(
  id: string,
  x: number,
  z: number,
  w: number,
  d: number,
  purpose: Room["purpose"],
  extra: Partial<Room> = {},
): Room {
  return {
    id,
    anchor: { x, z },
    size: { w, d },
    purpose,
    lights: [],
    objects: [],
    doors: [],
    ...extra,
  };
}

// ── The quiet practice: home base ────────────────────────────────────────────

const QUIET_PRACTICE: WorldManifest = {
  id: "quiet-practice",
  title: "The Quiet Practice",
  register: "painted",
  phase: "twilight",
  private: true,
  layout: {
    origin: { x: 0, z: 0 },
    size: { w: 38, d: 40 },
    ground: "grass",
    rooms: [
      room("hall", 0, -9, 14, 10, "orientation", {
        lights: [
          {
            emitter: "fire",
            at: { x: 0, z: -7.5 },
            range: 9,
            color: "#EAA050",
            intensity: 2.6,
          },
          {
            emitter: "altar",
            at: { x: -4.4, z: -11.6 },
            range: 6,
            color: "#FFD9A0",
            intensity: 1.5,
          },
        ],
        objects: ["chapter-001", "creed-cosmology"],
        doors: [{ to: "depths", kind: "stairs", at: { x: 0, z: -12.6 } }],
      }),
      room("approach", 0, 0, 10, 8, "transition", {
        lights: [
          {
            emitter: "lantern",
            at: { x: -4.2, z: 0.5 },
            range: 6,
            color: "#EAA050",
            intensity: 1.5,
          },
          {
            emitter: "lantern",
            at: { x: 4.2, z: 0.5 },
            range: 6,
            color: "#EAA050",
            intensity: 1.5,
          },
        ],
        objects: ["place-threshold"],
      }),
      room("court", 0, 8, 20, 10, "traversal", {
        objects: ["object-lantern"],
      }),
      room("grove", -12, 6, 11, 14, "recovery", {}),
      room("gate", 0, 16, 10, 5, "transition", {
        lights: [
          {
            emitter: "lantern",
            at: { x: 2.6, z: 15.6 },
            range: 5,
            color: "#EAA050",
            intensity: 1.2,
          },
        ],
        doors: [{ to: "ordinary-sacred", kind: "mist", at: { x: 18, z: 4 } }],
      }),
    ],
  },
  objects: [
    {
      id: "chapter-001",
      type: "chapter",
      title: "The one who kept going",
      room: "hall",
      at: { x: -3.6, z: -6.2 },
      plate: null,
      touched: ISO_TODAY,
      weight: 1,
    },
    {
      id: "creed-cosmology",
      type: "creed",
      title: "Four rules",
      room: "hall",
      at: { x: 3.8, z: -6.4 },
      plate: null,
      touched: ISO_WEEK,
      weight: 1,
    },
    {
      id: "place-threshold",
      type: "place",
      title: "The threshold",
      room: "approach",
      at: { x: 2.4, z: 2.6 },
      plate: null,
      touched: null,
      weight: 1,
    },
    {
      id: "object-lantern",
      type: "object",
      title: "The lantern",
      room: "court",
      at: { x: -6.4, z: 9.2 },
      plate: null,
      touched: null,
      weight: 1,
    },
  ],
  monuments: [],
  thread: {
    season: "The season of the long walk",
    chapter: {
      id: "chapter-001",
      title: "The one who kept going",
      line: "He built the room before he had anything to put in it.",
    },
  },
  weather: { recovery: null, days_since_ship: 0, sky: null, season_day: 69 },
  attention: { "chapter-001": ISO_TODAY, "creed-cosmology": ISO_WEEK },
  hero: { world: "quiet-practice", x: 0, z: -6.5 },
  backdrop: null,
  bed: null,
};

// ── The ordinary sacred: the lake, the dock, the couch and the dog ───────────

const ORDINARY_SACRED: WorldManifest = {
  id: "ordinary-sacred",
  title: "The Ordinary Sacred",
  register: "riso",
  phase: "day",
  private: false,
  layout: {
    origin: { x: 46, z: 2 },
    size: { w: 36, d: 32 },
    ground: "sand",
    rooms: [
      room("shore", 44, 10, 22, 10, "traversal", {
        objects: ["place-lake"],
      }),
      room("water", 44, -6, 24, 14, "reward", {}),
      room("porch", 57, 11, 11, 9, "recovery", {
        lights: [
          {
            emitter: "lantern",
            at: { x: 53.4, z: 8.2 },
            range: 6,
            color: "#b87818",
            intensity: 1.1,
          },
        ],
        objects: ["object-couch"],
      }),
      room("west-gate", 30, 4, 6, 8, "transition", {
        doors: [{ to: "quiet-practice", kind: "mist", at: { x: 18, z: 4 } }],
      }),
    ],
  },
  objects: [
    {
      id: "place-lake",
      type: "place",
      title: "The lake at the end of the road",
      room: "shore",
      at: { x: 40.5, z: 7.5 },
      plate: null,
      touched: ISO_WEEK,
      weight: 1,
    },
    {
      id: "object-couch",
      type: "object",
      title: "The couch, and the dog on it",
      room: "porch",
      at: { x: 58.5, z: 12.5 },
      plate: null,
      touched: null,
      weight: 1,
    },
  ],
  monuments: [],
  thread: { season: "The season of the long walk", chapter: null },
  weather: {},
  attention: {},
  hero: null,
  backdrop: null,
  bed: null,
};

// ── The party: watercolour, one golden light ─────────────────────────────────

const PARTY: WorldManifest = {
  id: "party",
  title: "The Party",
  register: "watercolor",
  phase: "twilight",
  private: false,
  layout: {
    origin: { x: 2, z: 48 },
    size: { w: 30, d: 26 },
    ground: "grass",
    rooms: [
      room("circle", 2, 48, 16, 14, "recovery", {
        lights: [
          {
            emitter: "brazier",
            at: { x: 2, z: 48 },
            range: 9,
            color: "#E8C066",
            intensity: 2.4,
          },
        ],
        objects: ["figure-party"],
      }),
      room("south-gate", 2, 34, 8, 6, "transition", {
        doors: [{ to: "quiet-practice", kind: "mist", at: { x: 2, z: 26 } }],
      }),
    ],
  },
  objects: [
    {
      id: "figure-party",
      type: "lore",
      title: "Everyone who walks beside him",
      room: "circle",
      at: { x: 5.2, z: 45.4 },
      plate: null,
      touched: null,
      weight: 1,
    },
  ],
  monuments: [],
  thread: { season: "The season of the long walk", chapter: null },
  weather: {},
  attention: {},
  hero: null,
  backdrop: null,
  bed: null,
};

// ── The forge: what shipped, standing up ─────────────────────────────────────

const FORGE_LINES: [string, string][] = [
  ["2026-09-08", "The mini, pulled over and running"],
  ["2026-09-06", "The Air, sold and wiped"],
  ["2026-09-02", "The config audit, every rule sourced"],
  ["2026-08-25", "The Ledger report, light mode with a toggle"],
  ["2026-08-19", "Forge, one hundred and thirteen skills indexed"],
  ["2026-08-05", "The wall, and everything pinned to it"],
];

const FORGE: WorldManifest = {
  id: "forge",
  title: "The Forge",
  register: "riso",
  phase: "day",
  private: false,
  layout: {
    origin: { x: -48, z: 0 },
    size: { w: 34, d: 28 },
    ground: "stone",
    rooms: [
      room("yard", -48, 0, 26, 20, "objective", {
        lights: [
          {
            emitter: "brazier",
            at: { x: -56, z: -6 },
            range: 8,
            color: "#b87818",
            intensity: 1.8,
          },
          {
            emitter: "brazier",
            at: { x: -40, z: -6 },
            range: 8,
            color: "#b87818",
            intensity: 1.8,
          },
        ],
      }),
      room("east-gate", -32, 2, 6, 8, "transition", {
        doors: [{ to: "quiet-practice", kind: "mist", at: { x: -20, z: 2 } }],
      }),
    ],
  },
  objects: [],
  monuments: FORGE_LINES.map(([date, line], i) => ({
    id: `ledger-${date}-${i}`,
    date,
    line,
    at: {
      x: -54 + (i % 3) * 6,
      z: 2 + Math.floor(i / 3) * 6,
    },
  })),
  thread: { season: "The season of the long walk", chapter: null },
  weather: {},
  attention: {},
  hero: null,
  backdrop: null,
  bed: null,
};

// ── The depths: down the stair, still flat ───────────────────────────────────

const DEPTHS: WorldManifest = {
  id: "depths",
  title: "The Depths",
  register: "paperback",
  phase: "midnight",
  private: true,
  layout: {
    origin: { x: 0, z: -200 },
    size: { w: 28, d: 24 },
    ground: "ash",
    rooms: [
      room("depth-1", 0, -200, 22, 18, "objective", {
        lights: [
          {
            emitter: "altar",
            at: { x: 0, z: -203 },
            range: 8,
            color: "#F0C060",
            intensity: 2.8,
          },
          {
            emitter: "brazier",
            at: { x: -7, z: -196 },
            range: 6,
            color: "#F0C060",
            intensity: 1.6,
          },
          {
            emitter: "brazier",
            at: { x: 7, z: -196 },
            range: 6,
            color: "#F0C060",
            intensity: 1.6,
          },
        ],
        objects: ["lore-depths"],
        doors: [{ to: "quiet-practice", kind: "stairs", at: { x: 0, z: -192 } }],
      }),
    ],
  },
  objects: [
    {
      id: "lore-depths",
      type: "lore",
      title: "What he does not say out loud",
      room: "depth-1",
      at: { x: -4.5, z: -199 },
      plate: null,
      touched: null,
      weight: 1,
    },
  ],
  monuments: [],
  thread: { season: "The season of the long walk", chapter: null },
  weather: {},
  attention: {},
  hero: null,
  backdrop: null,
  bed: null,
};

export const FIXTURE_WORLDS: WorldManifest[] = [
  QUIET_PRACTICE,
  ORDINARY_SACRED,
  PARTY,
  FORGE,
  DEPTHS,
];

export const FIXTURE_NAMES = [
  "hall",
  "border",
  "depth1",
  "unfold",
  "empty-satchel",
] as const;

export type FixtureName = (typeof FIXTURE_NAMES)[number];

export function isFixtureName(v: string | null | undefined): v is FixtureName {
  return !!v && (FIXTURE_NAMES as readonly string[]).includes(v);
}

/** One review state. Same world every time, so a screenshot diff means something. */
export function fixture(name: FixtureName): CosmosManifest {
  const worlds = FIXTURE_WORLDS.map((w) => ({ ...w }));
  const base: CosmosManifest = {
    worlds,
    hero: { world: "quiet-practice", x: 0, z: -6.5 },
    thread: QUIET_PRACTICE.thread,
    focus: null,
    fixture: name,
    satchel: [],
  };

  switch (name) {
    case "hall":
      return base;
    case "border":
      // Mid-crossing: half in the painted twilight, half in the riso day.
      return { ...base, hero: { world: "quiet-practice", x: 21, z: 4 } };
    case "depth1":
      return { ...base, hero: { world: "depths", x: 0, z: -197 } };
    case "unfold":
      return { ...base, satchel: ["chapter-001"] };
    case "empty-satchel":
      return {
        ...base,
        worlds: worlds.map((w) => ({
          ...w,
          attention: {},
          objects: w.objects.map((o) => ({ ...o, touched: null })),
        })),
        satchel: [],
      };
  }
}
