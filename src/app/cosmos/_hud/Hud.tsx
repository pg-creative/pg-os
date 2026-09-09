"use client";

/**
 * The HUD: DOM over the canvas, cream paper, light mode by default.
 *
 * The grammar is the reference's, the content is PG's. A character card top
 * left with a painted portrait, a name and a title. A compass top right. A
 * thread panel under it. Verbs on keys. And then everything the reference uses
 * to grade a player is CUT, because "bad nights render as weather, never as a
 * report card": no HP bar, no level, no rooms counter, no explored percentage,
 * no skill bar, no numbers of any kind anywhere in this file.
 *
 * The title on the card is the season, which is a pure function of his birthday
 * quarter and the date. Nothing is written to Hero's Chronicle to produce it.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { CAM_YAW } from "../_scene/IsoCamera";
import type { Runtime } from "../_scene/runtime";
import type { WorldManifest } from "../_scene/contract";

// ── Character card ───────────────────────────────────────────────────────────

export function CharacterCard({
  name,
  title,
  portrait,
}: {
  name: string;
  title: string;
  portrait: string;
}) {
  const [ok, setOk] = useState(true);
  return (
    <div className="cosmos-card">
      <div className="cosmos-card-frame">
        {ok ? (
          <img
            src={portrait}
            alt=""
            className="cosmos-card-portrait"
            onError={() => setOk(false)}
          />
        ) : (
          <span className="cosmos-card-glyph" aria-hidden>
            ✦
          </span>
        )}
      </div>
      <div className="cosmos-card-text">
        <p className="cosmos-card-name">{name}</p>
        <p className="cosmos-card-title">{title}</p>
      </div>
    </div>
  );
}

// ── Compass ──────────────────────────────────────────────────────────────────

const VISITED_KEY = "pg-os-cosmos-visited";
const CELL = 3;

/**
 * The compass shows where the lantern has been, and nothing else. No room count,
 * no percentage explored, no minimap of places he has not walked. Ground he has
 * carried the light across is remembered as a soft mark; everything else is the
 * same mist that eats an untouched page.
 *
 * The record is per device, in localStorage, because it is a memory of walking
 * rather than a fact about the vault. The vault's own memory of attention is
 * `state/attention.json`, written by the touch route, and that is the one the
 * mist reads.
 */
export function Compass({
  rt,
  worlds,
}: {
  rt: React.RefObject<Runtime>;
  worlds: WorldManifest[];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const visited = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(VISITED_KEY);
      if (raw) visited.current = new Set(JSON.parse(raw) as string[]);
    } catch {
      /* private mode, or a cleared store. An empty compass is a correct one. */
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    let saveAt = 0;
    const size = 116;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const r = rt.current;
      const el = canvas.current;
      if (!r || !el) return;

      const cell = `${Math.round(r.pos.x / CELL)},${Math.round(r.pos.z / CELL)}`;
      if (!visited.current.has(cell)) {
        visited.current.add(cell);
        saveAt = performance.now() + 1500;
      }
      if (saveAt && performance.now() > saveAt) {
        saveAt = 0;
        try {
          window.localStorage.setItem(
            VISITED_KEY,
            JSON.stringify([...visited.current].slice(-4000)),
          );
        } catch {
          /* nothing to do, and nothing worth telling him about */
        }
      }

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
      const scale = 1.05; // pixels per world unit

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // The mist. Everything starts here and the lantern subtracts from it.
      ctx.fillStyle = "rgba(120,104,96,0.16)";
      ctx.fillRect(0, 0, size, size);

      // Remembered ground.
      ctx.fillStyle = "rgba(140,92,12,0.5)";
      for (const key of visited.current) {
        const [gx, gz] = key.split(",").map(Number);
        const dx = (gx * CELL - r.pos.x) * scale;
        const dz = (gz * CELL - r.pos.z) * scale;
        // Rotate into compass space: the camera yaw, so up-screen is up-compass.
        const c = Math.cos(-CAM_YAW);
        const s = Math.sin(-CAM_YAW);
        const px = cx + (dx * c - dz * s);
        const py = cy + (dx * s + dz * c);
        if ((px - cx) ** 2 + (py - cy) ** 2 > R * R) continue;
        ctx.fillRect(px - 1.6, py - 1.6, 3.2, 3.2);
      }

      // The lantern, at the middle, always.
      ctx.fillStyle = "#EAA050";
      ctx.beginPath();
      ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(234,160,80,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      // Rim and the one letter that says which way is north.
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
  }, [rt, worlds]);

  return (
    <div className="cosmos-compass" aria-hidden>
      <canvas ref={canvas} style={{ width: 116, height: 116 }} />
    </div>
  );
}

// ── Thread panel ─────────────────────────────────────────────────────────────

/**
 * The thread: the season, and the witness's last draft chapter with its one
 * line. Never a task, never a count, never a list of things not done. Open at
 * the fire, closed on the road.
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
      <p className="cosmos-thread-eyebrow">The thread</p>
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

// ── Chrome: the two persistent controls, and one hint ────────────────────────

export const THEME_KEY = "pg-os-cosmos-theme";

/**
 * The Critic's deduction 9: round one shipped the mute and not the light toggle,
 * and PG's standing rule is "i dont like dark mode, at the very least always
 * give me a togggle". Light is the default here, the choice persists, and it
 * drives the OS's own `data-variant` through ModeProvider rather than opening a
 * second theme system beside it, so it is one toggle and not two.
 *
 * The OS keeps its palette choice in memory only, by design, so the PERSISTENCE
 * lives on this key. Named plainly rather than pretended away.
 */
export function useCosmosTheme(): ["light" | "dark", (t: "light" | "dark") => void] {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") setThemeState(saved);
    } catch {
      /* default light, which is the rule anyway */
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-variant",
      theme === "light" ? "laputa-day" : "laputa-midnight",
    );
    document.documentElement.setAttribute("data-cosmos-theme", theme);
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
      <span>{theme === "light" ? "light" : "dark"}</span>
    </button>
  );
}

/**
 * One hint, and it only ever names a verb that exists right now. Round one's
 * still said "scroll" under a page with nothing to scroll (deduction 11); this
 * one is derived from what is actually in reach.
 */
export function Hint({
  near,
  moved,
  reduced,
}: {
  near: string | null;
  moved: boolean;
  reduced: boolean;
}) {
  const text = useMemo(() => {
    if (reduced) return null;
    if (near) return `${near} · stand still, or press E`;
    if (!moved) return "click the ground to walk";
    return null;
  }, [near, moved, reduced]);

  return (
    <p className="cosmos-hint" data-hidden={text ? "false" : "true"}>
      {text ?? ""}
    </p>
  );
}
