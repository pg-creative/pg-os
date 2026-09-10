"use client";

/**
 * The stage: canvas, HUD, and the one page that is open.
 *
 * Prose arrives as server-rendered nodes and never as data, the panel is DOM at
 * the top layer, Escape closes, and a dwell posts to the touch route.
 *
 * The scene persists: one canvas for the whole cosmos, five biomes on one plane
 * inside it, and a deep link to a biome moves the Wayfarer rather than mounting
 * a second world. That is the difference between "a page per world" and "one
 * world you walk".
 *
 * THREE OF THE CRITIC'S, HERE.
 *
 * A MONUMENT NEVER OPENED. `objects` held pages only, so on a standing stone
 * both the dwell and E returned early while the hint printed the LEDGER line and
 * told him to press E. Monuments join the map now, and a stone unfolds its line.
 *
 * SITTING AT THE FIRE UNFOLDED THE CARD BESIDE IT. The mat is 1.1 m from a page
 * in the hall, so arriving at the hearth opened a chapter over the thread he had
 * just sat down to read. Sitting suspends the dwell: the thread is what opens at
 * the fire.
 *
 * "CLICK THE GROUND TO WALK" NEVER SHOWED. `moved` was set from position rather
 * than motion, and the first tick reports a position. It is set from the walker
 * actually moving now, and from the keys.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSound } from "../../_components/SoundProvider";
import type { CosmosManifest, SceneObject } from "./contract";
import { createRuntime, type Runtime } from "./runtime";
import { WorldCanvas, type HudState } from "./WorldCanvas";
import {
  Compass,
  Hint,
  KeyHints,
  ThemeToggle,
  ThreadPanel,
  Title,
  WeatherLine,
  YouAreHere,
  useCosmosTheme,
  useKeyboard,
} from "../_hud/Hud";
import { Satchel, SatchelButton } from "../_hud/Satchel";
import { Unfolded } from "../_hud/Unfolded";
import { SoundToggle, useAudioArm, useWorldSound, type BiomeVoice } from "./AmbientBed";

const PORTRAIT = "/agent-office/characters/wayfarer-0.png";
/** A working name, and a draft until PG says "that one". */
const HERO_NAME = "the Wayfarer";
/**
 * A real screenshot of this scene, with the HUD hidden and no paper edge in it.
 * It is served THROUGH THE GATE, not from `public/`: pg-os is a public repo and
 * `public/` is served with no cookie check, the quiet practice is private
 * forever, and a picture of it is still a picture of it.
 */
const STILL = "/api/cosmos/asset/vault/worlds/quiet-practice/plates/still-hall";

export function CosmosStage({
  manifest,
  bodies,
  sources,
  season,
}: {
  manifest: CosmosManifest;
  /** Page bodies, rendered on the server, keyed by page id. Never strings. */
  bodies: Record<string, ReactNode>;
  /** Each page's `source:` line, when it has one. */
  sources: Record<string, string>;
  /** The season name. A pure function of the date, computed on the server. */
  season: string;
}) {
  const rt = useRef<Runtime>(
    createRuntime(manifest.hero.x, manifest.hero.z, manifest.focus ?? manifest.hero.world),
  );
  const [theme, setTheme] = useCosmosTheme();
  const keyboard = useKeyboard();
  const [reduced, setReduced] = useState(false);
  const [hud, setHud] = useState<HudState>({
    world: manifest.hero.world,
    worldTitle: "",
    register: "painted",
    nearTitle: null,
    nearId: null,
    dwell: 0,
    sitting: false,
    // DESCENDED FROM THE FIRST FRAME, not from the first slow tick. `/cosmos/depths`
    // puts him at the depths' own origin (z -488.8, five hundred metres south of
    // everything else), and the canvas only learns that a quarter of a second in,
    // so the first paint of a deep link was the lit surface and the descent
    // arrived as a flash. The manifest already knows: `hero.world` is where he
    // stands and `focus` is what the URL asked for.
    depth: manifest.hero.world === "depths" || manifest.focus === "depths",
    x: manifest.hero.x,
    z: manifest.hero.z,
    room: null,
  });
  const [open, setOpen] = useState<string | null>(
    manifest.satchel.length && manifest.fixture === "unfold" ? manifest.satchel[0] : null,
  );
  const [satchel, setSatchel] = useState<string[]>(manifest.satchel);
  const [satchelOpen, setSatchelOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [moved, setMoved] = useState(false);
  const savedAt = useRef({ x: manifest.hero.x, z: manifest.hero.z });
  const restTimer = useRef<number | null>(null);

  const { enabled } = useSound();
  const armed = useAudioArm(enabled);
  const sound = useWorldSound(enabled && armed && !reduced);

  // ── Reduced motion. The canvas does not mount at all. ──
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(mq.matches);
      if (rt.current) rt.current.reduced = mq.matches;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /**
   * Everything that can be unfolded, in one map: the pages, and the LEDGER lines
   * standing in the forge. A monument that is already in `objects` (the keeper
   * puts them there so they carry a body) wins; one that is only in `monuments`
   * gets a stand-in whose body is its own line.
   */
  const objects = useMemo(() => {
    const map = new Map<string, SceneObject>();
    for (const w of manifest.worlds) {
      for (const o of w.objects) map.set(o.id, o);
      for (const m of w.monuments) {
        if (map.has(m.id)) continue;
        map.set(m.id, {
          id: m.id,
          type: "monument",
          title: m.line,
          room: "",
          at: m.at,
          plate: null,
          touched: null,
          weight: 0,
        });
      }
    }
    return map;
  }, [manifest.worlds]);

  /**
   * Which ids the VAULT gave as objects, as opposed to the stand-ins this file
   * makes for standing stones.
   *
   * The touch route knows the ids in `objects` and rightly 404s anything else.
   * Round 2.1 made a monument unfoldable, and the first thing that did was post
   * attention for a LEDGER line id: five 404s in the console and a page that
   * looked like it had failed. A stone is a thing he looked at and the vault
   * should remember it, but the vault decides that, not the scene. The moment
   * the keeper lists monuments in `objects` (which the round's contract says it
   * will) this set contains them and the write starts happening on its own.
   */
  const vaultIds = useMemo(() => {
    const ids = new Set<string>();
    for (const w of manifest.worlds) for (const o of w.objects) ids.add(o.id);
    return ids;
  }, [manifest.worlds]);

  /**
   * A monument with no body of its own reads its own line, and carries its date.
   *
   * The Critic's deduction 2: `mount.tsx` renders a body for every id in the
   * manifest, monuments included, and `readBodies` reads pages only, so the
   * stone's panel showed the blank placeholder ("The vault has not written this
   * one yet") and the LEDGER line it was raised for never reached the screen.
   * The keeper's half is that a monument in `objects` carries its line as the
   * body; this half is the fallback, and it is also where the date comes from,
   * because a rubbing is a rubbing OF a day.
   */
  const lines = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of manifest.worlds) for (const m of w.monuments) map.set(m.id, m.line);
    return map;
  }, [manifest.worlds]);

  const dates = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of manifest.worlds) for (const m of w.monuments) map.set(m.id, m.date);
    return map;
  }, [manifest.worlds]);

  const current = useMemo(
    () => manifest.worlds.find((w) => w.id === hud.world) ?? manifest.worlds[0],
    [manifest.worlds, hud.world],
  );

  /**
   * ONE TOUCH PER OPEN. What the panel is showing right now, in a ref, so the
   * write is a function of the transition and not of how long he stands there.
   * The Critic measured ten writes in twelve seconds from one man standing still.
   */
  const openRef = useRef<string | null>(null);

  // ── Opening a page. One act: it opens, it is remembered, it goes in the bag. ──
  const openPage = useCallback(
    (id: string) => {
      if (!objects.has(id)) return;
      // Whatever opened it (a dwell, E, a held thumb, a click on the thing), this
      // approach is spent: the dwell will not fire on it again until he leaves.
      if (rt.current) {
        rt.current.latched = id;
        rt.current.dwell = 0;
      }
      const already = openRef.current === id;
      openRef.current = id;
      setOpen(id);
      setSatchel((s) => (s.includes(id) ? s : [...s, id]));
      if (already) return;
      // A fixture is a review state, not a place he has been. Writing attention
      // for an id that exists only in the harness would grow `attention.json`
      // with pages the vault has never heard of.
      if (manifest.fixture) return;
      if (!vaultIds.has(id)) return;
      const r = rt.current;
      void fetch("/api/cosmos/touch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          hero: r
            ? { world: r.world || manifest.hero.world, x: r.pos.x, z: r.pos.z }
            : undefined,
        }),
        keepalive: true,
      }).catch(() => {});
    },
    [objects, vaultIds, manifest.hero.world, manifest.fixture],
  );

  const closePage = useCallback(() => {
    openRef.current = null;
    setOpen(null);
  }, []);

  // ── A door. The stair down is a scene state, not a second scene. ──
  const takeDoor = useCallback(
    (to: string) => {
      const r = rt.current;
      const target = manifest.worlds.find((w) => w.id === to);
      if (!r || !target) return;
      // Arrive at the door on the other side, facing into the room.
      const back = target.layout.rooms
        .flatMap((room) => room.doors)
        .find((d) => d.kind === "stairs");
      const at = back ?? { at: target.layout.origin };
      r.pos.set(at.at.x, 0, at.at.z + 2.6);
      r.dest = null;
      r.vel.set(0, 0, 0);
      r.dwell = 0;
      r.intent = null;
      // He arrives standing on the stair he just came out of; without this the
      // dwell would take him straight back up it.
      r.latched = `door:${r.world || to}`;
      r.target.set(r.pos.x, 1.5, r.pos.z);
      setMoved(true);
    },
    [manifest.worlds],
  );

  // ── Keys. E opens, Escape closes, I is the satchel, J the thread, U the UI. ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const r = rt.current;
      if (!r) return;
      const k = e.key.toLowerCase();
      if (k === "escape") {
        r.intent = null;
        if (satchelOpen) setSatchelOpen(false);
        else closePage();
        return;
      }
      if (k === "i") return setSatchelOpen((s) => !s);
      if (k === "j") return setThreadOpen((s) => !s);
      if (k === "u") return setChrome((s) => !s);
      if (k === "e") {
        if (r.near?.id.startsWith("door:")) takeDoor(r.near.id.slice(5));
        else if (r.near) openPage(r.near.id);
        return;
      }
      if ("wasd".includes(k)) {
        // Taking hold of the keyboard cancels a walk order, and its purpose with it.
        r.intent = null;
        r.keys.add(k);
        setMoved(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      rt.current?.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [openPage, takeDoor, satchelOpen, closePage]);

  // ── The bed follows the biome; the fire follows the hearth. ──
  useEffect(() => {
    sound.setBiome((current?.register ?? "painted") as BiomeVoice);
  }, [current?.register, sound]);
  useEffect(() => {
    sound.setFire(hud.sitting);
  }, [hud.sitting, sound]);
  /**
   * THE HALL HAS ITS OWN BED NOW, and a room's wins over its biome's.
   *
   * `bed-hall.mp3` (Higgsfield, 10 s: a low hearth fire, wind on paper windows,
   * one timber creak, a far chime) is named on the shrine hall's room block, not
   * on the world, because that is the truth of it. Step out onto the grounds and
   * the practice's own `bed:` takes over, which is still the procedural floor;
   * `setBed` crossfades over a second and a half either way.
   */
  const bed = useMemo(() => {
    const room = current?.layout.rooms.find((r) => r.id === hud.room);
    return room?.bed ?? current?.bed ?? null;
  }, [current, hud.room]);

  useEffect(() => {
    sound.setBed(bed);
  }, [bed, sound]);

  // ── Where he stood. The never-restart proof: reload and he is still there. ──
  const saveHero = useCallback(() => {
    const r = rt.current;
    if (!r || !r.world) return;
    if (manifest.fixture) return;
    // WHERE HE STOOD IS HIS TOO. A page nobody has touched has nothing new to
    // remember: the position it would write is the one the server just served
    // it, plus whatever the steering nudged him by while the tab sat open. Round
    // 2.1 posted every fifteen seconds forever, which is the dwell storm one
    // interval slower, and it survived the first fix because a man being pushed
    // off a blocker counts as having moved.
    if (!r.armed) return;
    const last = savedAt.current;
    if (Math.hypot(r.pos.x - last.x, r.pos.z - last.z) < 0.4) return;
    savedAt.current = { x: r.pos.x, z: r.pos.z };
    void fetch("/api/cosmos/touch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hero: { world: r.world, x: r.pos.x, z: r.pos.z } }),
      keepalive: true,
    }).catch(() => {});
  }, [manifest.fixture]);

  useEffect(() => {
    const save = saveHero;
    const every = window.setInterval(save, 15_000);
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") save();
    });
    return () => {
      window.clearInterval(every);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [saveHero]);

  const onTick = useCallback(
    (s: HudState) => {
      setHud(s);
      const r = rt.current;
      if (!r) return;
      // Motion, not position: the first tick reports a position and always did.
      if (r.moving) setMoved(true);
      if (r.moving) return;
      const last = savedAt.current;
      if (Math.hypot(s.x - last.x, s.z - last.z) < 1) return;
      if (restTimer.current !== null) window.clearTimeout(restTimer.current);
      restTimer.current = window.setTimeout(() => saveHero(), 900);
    },
    [saveHero],
  );

  const openObject = open ? (objects.get(open) ?? null) : null;
  const satchelItems = useMemo(
    () => satchel.map((id) => objects.get(id)).filter((o): o is SceneObject => !!o),
    [satchel, objects],
  );

  // The thread is open when he sits at the fire, or when he asks for it.
  const thread = threadOpen || hud.sitting;
  const invitation = manifest.thread.chapter?.line ?? null;

  // ── Reduced motion: a still of the hall, and the title. Nothing that moves,
  //    and no hint that names a verb this page does not have. ──
  if (reduced) {
    return (
      <div className="cosmos-still">
        <img src={STILL} alt="The shrine hall at twilight, from the road below." />
        <div className="cosmos-hud cosmos-hud-still">
          <Title world={current?.title ?? HERO_NAME} season={season} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="cosmos-stage"
      data-theme={theme}
      data-depth={hud.depth ? "true" : "false"}
      data-near={hud.nearId ?? ""}
      data-chrome={chrome ? "true" : "false"}
      /* Where the SERVER put him on this load. The never-restart proof reads
         this before and after a reload: walk, reload, and it has moved. */
      data-hero={`${manifest.hero.world}:${manifest.hero.x.toFixed(1)},${manifest.hero.z.toFixed(1)}`}
    >
      <WorldCanvas
        manifest={manifest}
        rt={rt}
        theme={theme}
        onTick={onTick}
        onOpen={openPage}
        onDoor={takeDoor}
        onStep={sound.step}
        reduced={reduced}
      />

      <div className="cosmos-hud" hidden={!chrome}>
        <div className="cosmos-tl">
          <img className="cosmos-portrait" src={PORTRAIT} alt="" aria-hidden />
          <Title world={current?.title ?? ""} season={manifest.thread.season || season} />
        </div>

        <WeatherLine
          weather={current?.weather}
          hour={new Date().getHours()}
          invitation={invitation}
        />

        <YouAreHere room={hud.room} />

        <div className="cosmos-dock">
          <button
            type="button"
            className="cosmos-chip cosmos-chip-wide"
            aria-pressed={thread}
            onClick={() => setThreadOpen((s) => !s)}
          >
            <span aria-hidden>❧</span>
            <span>the thread</span>
            {keyboard && <kbd>J</kbd>}
          </button>
          <SatchelButton count={satchel.length} onClick={() => setSatchelOpen((s) => !s)} />
          <SoundToggle />
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>

        <div className="cosmos-br">
          <Compass rt={rt} worlds={manifest.worlds} />
          <KeyHints keyboard={keyboard} />
        </div>

        <ThreadPanel
          season={manifest.thread.season || season}
          chapter={manifest.thread.chapter}
          open={thread}
        />

        <Hint
          near={hud.nearTitle}
          moved={moved}
          reduced={reduced}
          keyboard={keyboard}
          sitting={hud.sitting}
        />
      </div>

      <Satchel
        open={satchelOpen}
        items={satchelItems}
        onPick={(id) => {
          setSatchelOpen(false);
          // Rummaging in the bag is not standing in front of a thing, so it
          // opens the page and writes nothing.
          openRef.current = id;
          setOpen(id);
        }}
        onClose={() => setSatchelOpen(false)}
      />

      <Unfolded
        object={openObject}
        body={open ? (bodies[open] ?? lines.get(open) ?? null) : null}
        source={open ? (sources[open] ?? null) : null}
        date={open ? (dates.get(open) ?? null) : null}
        register={current?.register ?? "painted"}
        onClose={closePage}
      />
    </div>
  );
}
