"use client";

/**
 * The HUD: DOM over the canvas, cream paper, light mode by default.
 *
 * THE SHAPE IS THE REFERENCE'S, THE WORDS ARE PG'S. From the painted meadow
 * world he sent mid-round: an overline and a title top left, the weather as one
 * sentence top right, one invitation under it, YOU ARE HERE over the place name
 * bottom left, the journal and the mute bottom centre, key hints bottom right,
 * and U to hide all of it. Copied as a layout, never as copy.
 *
 * And everything that grades him is CUT, because "bad nights render as weather,
 * never as a report card": no HP bar, no level, no rooms counter, no percentage
 * explored, no "0 / 3 discovered" (the reference has one; we do not). There is
 * not a single digit anywhere in this file. Where the weather needs a number it
 * is spelled: four days, not 4.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMode } from "../../_components/ModeProvider";
import { CAM_YAW } from "../_scene/IsoCamera";
import type { Runtime } from "../_scene/runtime";
import type { WorldManifest } from "../_scene/contract";

// ── Top left: the overline, the title, the season ────────────────────────────

export function Title({
  world,
  season,
}: {
  world: string;
  /** A label until PG names it, so it is set small and never as a heading. */
  season: string;
}) {
  return (
    <div className="cosmos-title">
      <p className="cosmos-overline">the cosmos</p>
      <h1 className="cosmos-worldname">{world}</h1>
      {season && <p className="cosmos-season">{season}</p>}
    </div>
  );
}

// ── Top right: the weather, as a sentence ────────────────────────────────────

export type Weather = Record<string, number | string | null>;

/**
 * One sentence from `state/weather.json`. Weather, and only weather.
 *
 * THE COUNTER IS GONE. The Critic's deduction 6, and it was right: "eight days
 * since the pages" was the first line the eye read top right on every load. A
 * duration spelled out is still a duration, and a duration since he last did the
 * thing is a scoreboard however softly it is set. PG's rule is that a bad night
 * renders as weather and never as a report card, and this file had been reading
 * "no digits" as the rule when the rule was "no counting".
 *
 * So the numbers become ADJECTIVES, or they say nothing. Sleep is a rested
 * morning or a thin one. Silence is a heavier evening. The count of days lives
 * where it belongs and where it already lived: in the mist, which thickens
 * (`weatherLook` in `WorldCanvas`) and is a thing you feel rather than read.
 */
export function weatherSentence(w: Weather | undefined, hour: number): string {
  const num = (k: string): number | null => {
    const v = w?.[k];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const str = (k: string): string | null => {
    const v = w?.[k];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  // The sky. The vault's word for it when it has one, the hour when it does not.
  const sky = str("sky");
  const timeOfDay =
    hour < 5 ? "night" : hour < 11 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";
  const head = sky ? `${sky} ${timeOfDay}` : `a quiet ${timeOfDay}`;

  // One clause after it, at most, and it is an adjective about the air.
  const air: string[] = [];
  const recovery = num("recovery");
  if (recovery !== null) {
    air.push(recovery >= 70 ? "clear and rested" : recovery >= 40 ? "soft-edged" : "thin air");
  }
  const pages = num("pages_days_ago");
  const ship = num("days_since_ship");
  const quiet = Math.max(pages ?? 0, ship ?? 0);
  if (!air.length && (pages !== null || ship !== null)) {
    air.push(quiet >= 5 ? "the air gone heavy" : quiet >= 2 ? "a little haze on it" : "the air clear");
  }

  const cap = head[0].toUpperCase() + head.slice(1);
  return air.length ? `${cap}, ${air[0]}.` : `${cap}.`;
}

export function WeatherLine({
  weather,
  hour,
  invitation,
}: {
  weather: Weather | undefined;
  hour: number;
  /** One line from the thread, or nothing. Never written here. */
  invitation: string | null;
}) {
  const night = hour < 5 || hour >= 19;
  return (
    <div className="cosmos-weather">
      <p className="cosmos-weather-line">
        <span className="cosmos-weather-glyph" aria-hidden>
          {night ? "☾" : "☀"}
        </span>
        {weatherSentence(weather, hour)}
      </p>
      {invitation && (
        <div className="cosmos-invite">
          <p className="cosmos-overline">the thread</p>
          <p className="cosmos-invite-line">{invitation}</p>
        </div>
      )}
    </div>
  );
}

// ── Bottom left: where he is ─────────────────────────────────────────────────

/** A room id, set as a name. Ids are the vault's; this only unhyphenates them. */
export function roomLabel(id: string | null): string {
  if (!id) return "";
  return id.replace(/[-_]+/g, " ");
}

export function YouAreHere({ room }: { room: string | null }) {
  return (
    <div className="cosmos-here" data-empty={room ? "false" : "true"}>
      <p className="cosmos-here-eyebrow">
        <span className="cosmos-here-dot" aria-hidden />
        you are here
      </p>
      <p className="cosmos-here-name">{roomLabel(room)}</p>
    </div>
  );
}

// ── Bottom right: the compass, and the keys ──────────────────────────────────

/**
 * The compass shows what he has already looked at, and nothing else. No room
 * count, no percentage explored, no minimap of places he has not walked.
 *
 * THE SECOND MEMORY IS GONE. The Critic's deduction 13: this kept its own
 * `pg-os-cosmos-visited` set of walked cells in localStorage, a per-device
 * memory of walking standing beside the vault's own `state/attention.json`,
 * which is committed, survives the machine, and is the memory the mist already
 * reads. Two records of the same fact is the thing PG's rule forbids, and the
 * one in the browser is the one that loses.
 *
 * So it reads attention: a mark for every object the vault remembers him
 * unfolding, faded by how long ago, in the same "recent is bright, old is mist"
 * grammar as the world. Nothing is written here at all.
 */
export function Compass({
  rt,
  worlds,
}: {
  rt: React.RefObject<Runtime>;
  worlds: WorldManifest[];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  /** Attended objects, in world coordinates, with 0 for today and 1 for never. */
  const marks = useMemo(() => {
    const out: { x: number; z: number; age: number }[] = [];
    for (const w of worlds) {
      const at = new Map<string, { x: number; z: number }>();
      for (const o of w.objects) at.set(o.id, o.at);
      for (const m of w.monuments) at.set(m.id, m.at);
      for (const [id, iso] of Object.entries(w.attention ?? {})) {
        const p = at.get(id);
        if (!p) continue;
        const d = Date.parse(iso);
        const age = Number.isNaN(d)
          ? 1
          : Math.min(1, Math.max(0, (Date.now() - d) / (21 * 86_400_000)));
        out.push({ x: p.x, z: p.z, age });
      }
    }
    return out;
  }, [worlds]);

  useEffect(() => {
    let raf = 0;
    const size = 92;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const r = rt.current;
      const el = canvas.current;
      if (!r || !el) return;

      const ctx = el.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (el.width !== size * dpr) {
        el.width = size * dpr;
        el.height = size * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const R = size / 2 - 4;
      const scale = 0.9;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = "rgba(120,104,96,0.16)";
      ctx.fillRect(0, 0, size, size);

      const c = Math.cos(-CAM_YAW);
      const s = Math.sin(-CAM_YAW);
      for (const m of marks) {
        const dx = (m.x - r.pos.x) * scale;
        const dz = (m.z - r.pos.z) * scale;
        const px = cx + (dx * c - dz * s);
        const py = cy + (dx * s + dz * c);
        if ((px - cx) ** 2 + (py - cy) ** 2 > R * R) continue;
        // Bright for today, mist for three weeks ago. The same rule as the world.
        ctx.fillStyle = `rgba(140,92,12,${(0.62 - m.age * 0.42).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.1 - m.age * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#EAA050";
      ctx.beginPath();
      ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(234,160,80,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      ctx.strokeStyle = "rgba(110,72,12,0.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(110,72,12,0.85)";
      ctx.font = "600 9px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText("N", cx, 11);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [rt, marks]);

  return (
    <div className="cosmos-compass" aria-hidden>
      <canvas ref={canvas} style={{ width: 92, height: 92 }} />
    </div>
  );
}

/** Whether this person has a keyboard. Nothing says "press E" to a thumb. */
export function useKeyboard(): boolean {
  const [has, setHas] = useState(false);
  useEffect(() => {
    const fine =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: fine)").matches;
    if (fine) setHas(true);
    const onKey = () => setHas(true);
    window.addEventListener("keydown", onKey, { once: true });
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return has;
}

export function KeyHints({ keyboard }: { keyboard: boolean }) {
  if (!keyboard) return null;
  return (
    <div className="cosmos-keys" aria-hidden>
      <p>
        <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd> wander
      </p>
      <p>
        <kbd>E</kbd> look closer
      </p>
      <p>
        <kbd>U</kbd> hide this
      </p>
    </div>
  );
}

// ── The thread, as the journal ───────────────────────────────────────────────

/**
 * The thread: the season, and the witness's last draft chapter with its one
 * line. Never a task, never a count, never a list of things not done. It opens
 * at the fire and on J, and closes on either again.
 */
export function ThreadPanel({
  season,
  chapter,
  open,
}: {
  season: string;
  chapter: { title: string; line: string } | null;
  open: boolean;
}) {
  return (
    <div className="cosmos-thread" data-open={open ? "true" : "false"} aria-hidden={!open}>
      <p className="cosmos-thread-eyebrow">the thread</p>
      <p className="cosmos-thread-season">{season}</p>
      {chapter && (
        <>
          <p className="cosmos-thread-chapter">{chapter.title}</p>
          <p className="cosmos-thread-line">{chapter.line}</p>
        </>
      )}
    </div>
  );
}

// ── Chrome ───────────────────────────────────────────────────────────────────

export const THEME_KEY = "pg-os-cosmos-theme";

/**
 * Light by default, the choice persists, and it drives the OS's OWN palette
 * through `ModeProvider.setMode` rather than opening a second theme system
 * beside it.
 *
 * The Critic's deduction 14: round two set `data-variant` on the document by
 * hand, so the attribute changed and the OS's provider, which owns that
 * attribute and re-asserts it on its own clock, put it straight back. His dark
 * choice never reached the dashboard. Going through `setMode` also turns the
 * OS's auto mode off, which is what choosing a palette means everywhere else in
 * this app.
 */
export function useCosmosTheme(): ["light" | "dark", (t: "light" | "dark") => void] {
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const { setMode } = useMode();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") setThemeState(saved);
    } catch {
      /* default light, which is the rule anyway */
    }
  }, []);

  useEffect(() => {
    setMode(theme === "light" ? "laputa-day" : "laputa-midnight");
    document.documentElement.setAttribute("data-cosmos-theme", theme);
    // `setMode` is recreated on every provider render; depending on it here
    // would re-assert the palette in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    try {
      window.localStorage.setItem(THEME_KEY, t);
    } catch {
      /* the world still changes, it just forgets by morning */
    }
  };

  return [theme, setTheme];
}

export function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}) {
  return (
    <button
      type="button"
      className="cosmos-chip"
      aria-pressed={theme === "dark"}
      aria-label={theme === "light" ? "Light, click for dark" : "Dark, click for light"}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <span aria-hidden>{theme === "light" ? "☀" : "☾"}</span>
    </button>
  );
}

/**
 * One hint, and it only ever names a verb that exists right now: inside reach,
 * with the key named only when there is a keyboard to press it on, and never a
 * rendered empty pill before the first thing comes into reach.
 */
export function Hint({
  near,
  moved,
  reduced,
  keyboard,
  sitting,
}: {
  near: string | null;
  moved: boolean;
  reduced: boolean;
  keyboard: boolean;
  /** On the hearth mat the dwell is suspended, so standing still is not a verb. */
  sitting: boolean;
}) {
  const text = useMemo(() => {
    if (reduced) return null;
    if (near) {
      if (!keyboard) return `${near} · hold to open`;
      return sitting ? `${near} · press E` : `${near} · stand still, or press E`;
    }
    if (!moved) return keyboard ? "click the ground to walk" : "tap the ground to walk";
    return null;
  }, [near, moved, reduced, keyboard, sitting]);

  if (!text) return null;
  return <p className="cosmos-hint">{text}</p>;
}
