"use client";

/**
 * The stage: canvas, HUD, and the one page that is open.
 *
 * EXTENDS round one's `WorldStage`, with the scroll track and the plate switcher
 * deleted and everything else kept: prose arrives as server-rendered nodes and
 * never as data, the panel is DOM at the top layer, Escape closes, and a dwell
 * posts to the touch route.
 *
 * What is new is that the scene persists. There is one canvas for the whole
 * cosmos, five biomes on one plane inside it, and a deep link to a biome moves
 * the Wayfarer rather than mounting a second world. That is the difference
 * between "a page per world" and "one world you walk".
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
  CharacterCard,
  Compass,
  Hint,
  ThemeToggle,
  ThreadPanel,
  useCosmosTheme,
} from "../_hud/Hud";
import { Satchel, SatchelButton } from "../_hud/Satchel";
import { Unfolded } from "../_hud/Unfolded";
import { SoundToggle, useAudioArm, useWorldSound, type BiomeVoice } from "./AmbientBed";

const PORTRAIT = "/agent-office/characters/wayfarer-0.png";
/** A working name, and a draft until PG says "that one". */
const HERO_NAME = "the Wayfarer";
/**
 * A real screenshot of this scene, taken with the HUD hidden and with no paper
 * edge in it (the Critic's deduction 11: round one's still kept the plate's torn
 * white border). Regenerate it whenever the hall changes.
 *
 * It is served THROUGH THE GATE, not from `public/`. pg-os is a public repo and
 * `public/` is served with no cookie check; the quiet practice is private
 * forever, and a picture of it is still a picture of it. So the file lives in
 * the vault beside the world it shows, and this URL is the same extensionless
 * asset route every plate uses.
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
  const rt = useRef<Runtime>(createRuntime(manifest.hero.x, manifest.hero.z));
  const [theme, setTheme] = useCosmosTheme();
  const [reduced, setReduced] = useState(false);
  const [hud, setHud] = useState<HudState>({
    world: manifest.hero.world,
    worldTitle: "",
    register: "painted",
    nearTitle: null,
    nearId: null,
    dwell: 0,
    sitting: false,
    depth: false,
    x: manifest.hero.x,
    z: manifest.hero.z,
  });
  const [open, setOpen] = useState<string | null>(
    manifest.satchel.length && manifest.fixture === "unfold" ? manifest.satchel[0] : null,
  );
  const [satchel, setSatchel] = useState<string[]>(manifest.satchel);
  const [satchelOpen, setSatchelOpen] = useState(false);
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

  const objects = useMemo(() => {
    const map = new Map<string, SceneObject>();
    for (const w of manifest.worlds) for (const o of w.objects) map.set(o.id, o);
    return map;
  }, [manifest.worlds]);

  const current = useMemo(
    () => manifest.worlds.find((w) => w.id === hud.world) ?? manifest.worlds[0],
    [manifest.worlds, hud.world],
  );

  // ── Opening a page. One act: it opens, it is remembered, it goes in the bag. ──
  const openPage = useCallback(
    (id: string) => {
      if (!objects.has(id)) return;
      setOpen(id);
      setSatchel((s) => (s.includes(id) ? s : [...s, id]));
      // A fixture is a review state, not a place he has been. Writing attention
      // for an id that exists only in the harness would grow `attention.json`
      // with pages the vault has never heard of, and the touch route rightly
      // 404s them; that 404 was the last console error in the run.
      if (manifest.fixture) return;
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
    [objects, manifest.hero.world, manifest.fixture],
  );

  const closePage = useCallback(() => setOpen(null), []);

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
      r.pos.set(at.at.x, 0, at.at.z + 2.2);
      r.dest = null;
      r.vel.set(0, 0, 0);
      r.dwell = 0;
      r.target.set(r.pos.x, 0.9, r.pos.z);
      setMoved(true);
    },
    [manifest.worlds],
  );

  // ── Keys. E opens, Escape closes, I is the satchel. ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const r = rt.current;
      if (!r) return;
      const k = e.key.toLowerCase();
      if (k === "escape") {
        if (satchelOpen) setSatchelOpen(false);
        else setOpen(null);
        return;
      }
      if (k === "i") {
        setSatchelOpen((s) => !s);
        return;
      }
      if (k === "e") {
        if (r.near?.id.startsWith("door:")) takeDoor(r.near.id.slice(5));
        else if (r.near) openPage(r.near.id);
        return;
      }
      if ("wasd".includes(k)) {
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
  }, [openPage, takeDoor, satchelOpen]);

  // ── The bed follows the biome; the fire follows the hearth. ──
  useEffect(() => {
    sound.setBiome((current?.register ?? "painted") as BiomeVoice);
  }, [current?.register, sound]);
  useEffect(() => {
    sound.setFire(hud.sitting);
  }, [hud.sitting, sound]);

  // ── Where he stood. The never-restart proof: reload and he is still there. ──
  const saveHero = useCallback(() => {
    const r = rt.current;
    if (!r || !r.world) return;
    // Same rule: a fixture never moves the real Wayfarer.
    if (manifest.fixture) return;
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

  /**
   * And once he stops. A fifteen second interval plus `pagehide` looks like it
   * covers everything until a reload lands inside the window: he walks, he
   * reloads, and the world puts him back where he was fourteen seconds ago. A
   * save a second after he comes to rest is what makes the never-restart proof
   * true of a real session rather than of a patient one.
   */
  const onTick = useCallback(
    (s: HudState) => {
      setHud(s);
      if (!s.nearId && (Math.abs(s.x) > 0.4 || Math.abs(s.z) > 0.4)) setMoved(true);
      const r = rt.current;
      if (!r || r.moving) return;
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

  // ── Reduced motion: a still of the hall, and the card. Nothing that moves,
  //    and no hint that names a verb this page does not have. ──
  if (reduced) {
    return (
      <div className="cosmos-still">
        <img src={STILL} alt="The shrine hall at twilight, from the road below." />
        <div className="cosmos-hud cosmos-hud-still">
          <CharacterCard name={HERO_NAME} title={season} portrait={PORTRAIT} />
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

      <div className="cosmos-hud">
        <CharacterCard name={HERO_NAME} title={season} portrait={PORTRAIT} />

        <div className="cosmos-hud-right">
          <Compass rt={rt} worlds={manifest.worlds} />
          <ThreadPanel
            season={manifest.thread.season || season}
            chapter={manifest.thread.chapter}
            open={hud.sitting}
          />
        </div>

        <div className="cosmos-chrome">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <SoundToggle />
          <SatchelButton count={satchel.length} onClick={() => setSatchelOpen((s) => !s)} />
        </div>

        <Hint near={hud.nearTitle} moved={moved} reduced={reduced} />
      </div>

      <Satchel
        open={satchelOpen}
        items={satchelItems}
        onPick={(id) => {
          setSatchelOpen(false);
          setOpen(id);
        }}
        onClose={() => setSatchelOpen(false)}
      />

      <Unfolded
        object={openObject}
        body={open ? bodies[open] : null}
        source={open ? (sources[open] ?? null) : null}
        register={current?.register ?? "painted"}
        onClose={closePage}
      />
    </div>
  );
}
