"use client";

/**
 * Music Player Lab — 4 live switchable redesigns of the topbar music player.
 * Each variant themes by GENRE (per src/lib/genreTheme.ts) and shows both the
 * closed topbar pill AND the open dropdown at once.
 *   1 SceneWash   2 FoxfireOrb   3 ScenePanel   4 InkCipher (falsifier)
 * Deep link: ?v=1|2|3|4 , ?genre=Lofi|Chill|Game|Jazz|Ambient|live , ?phase=day|twilight|night
 */

import { useEffect, useState } from "react";
import type { MusicGenre } from "@/lib/musicSources";
import V1SceneWash from "./_variants/V1SceneWash";
import V2FoxfireOrb from "./_variants/V2FoxfireOrb";
import V3ScenePanel from "./_variants/V3ScenePanel";
import V4InkCipher from "./_variants/V4InkCipher";

type Phase = "day" | "twilight" | "night";
type GenrePick = MusicGenre | "live";

const VARIANTS = [
  { id: "1", label: "1 · SceneWash", C: V1SceneWash },
  { id: "2", label: "2 · FoxfireOrb", C: V2FoxfireOrb },
  { id: "3", label: "3 · ScenePanel", C: V3ScenePanel },
  { id: "4", label: "4 · InkCipher", C: V4InkCipher },
];

const GENRES: GenrePick[] = [
  "live",
  "Lofi",
  "Chill",
  "Game",
  "Jazz",
  "Ambient",
];
const PHASES: Phase[] = ["day", "twilight", "night"];
const PHASE_VAR: Record<Phase, string> = {
  day: "laputa-day",
  twilight: "laputa-twilight",
  night: "laputa-midnight",
};

export default function MusicPlayerLab() {
  const [v, setV] = useState("1");
  const [genre, setGenre] = useState<GenrePick>("live");
  const [phase, setPhase] = useState<Phase>("day");
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const qv = q.get("v");
    const qg = q.get("genre") as GenrePick | null;
    const qp = q.get("phase") as Phase | null;
    if (qv && VARIANTS.some((x) => x.id === qv)) setV(qv);
    if (qg && GENRES.includes(qg)) setGenre(qg);
    if (qp && PHASES.includes(qp)) setPhase(qp);
  }, []);

  // Drive the real OS palette so panel tokens match the previewed sky.
  useEffect(() => {
    const prev = document.documentElement.getAttribute("data-variant");
    document.documentElement.setAttribute("data-variant", PHASE_VAR[phase]);
    return () => {
      if (prev) document.documentElement.setAttribute("data-variant", prev);
    };
  }, [phase]);

  const sync = (
    next: Partial<{ v: string; genre: GenrePick; phase: Phase }>,
  ) => {
    const u = new URL(window.location.href);
    u.searchParams.set("v", next.v ?? v);
    u.searchParams.set("genre", next.genre ?? genre);
    u.searchParams.set("phase", next.phase ?? phase);
    window.history.replaceState(null, "", u);
  };

  const Active = VARIANTS.find((x) => x.id === v) ?? VARIANTS[0];
  const previewGenre = genre === "live" ? undefined : genre;

  const pill = (on: boolean): React.CSSProperties => ({
    padding: "4px 10px",
    borderRadius: 7,
    border: `1px solid ${on ? "#fff" : "transparent"}`,
    background: on ? "#fff" : "transparent",
    color: on ? "#000" : "#cbd",
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  });
  const sep = (
    <span
      style={{ width: 1, background: "rgba(255,255,255,0.2)", margin: "0 3px" }}
    />
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url('/art/aesthetic-2026-05-20/emaki-sky-${phase}_0.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        position: "relative",
      }}
    >
      {/* legibility scrim for darker skies */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            phase === "day" ? "rgba(255,255,255,0.04)" : "rgba(8,6,12,0.42)",
          pointerEvents: "none",
        }}
      />

      {/* Switcher */}
      <div
        style={{
          position: "fixed",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100000,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "5px 6px",
          borderRadius: 10,
          background: "rgba(8,8,10,0.86)",
          border: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          fontFamily: "ui-monospace, monospace",
          maxWidth: "calc(100vw - 24px)",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {VARIANTS.map((x) => (
          <button
            key={x.id}
            onClick={() => {
              setV(x.id);
              sync({ v: x.id });
            }}
            style={pill(x.id === v)}
          >
            {x.label}
          </button>
        ))}
        {sep}
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => {
              setGenre(g);
              sync({ genre: g });
            }}
            style={pill(g === genre)}
          >
            {g}
          </button>
        ))}
        {sep}
        {PHASES.map((p) => (
          <button
            key={p}
            onClick={() => {
              setPhase(p);
              sync({ phase: p });
            }}
            style={pill(p === phase)}
          >
            {p}
          </button>
        ))}
        {sep}
        <button onClick={() => setPlaying((x) => !x)} style={pill(playing)}>
          {playing ? "playing" : "idle"}
        </button>
      </div>

      {/* Simulated topbar strip with the variant's closed pill on the right */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          marginTop: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
          padding: "10px 18px",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <span
          style={{
            marginRight: "auto",
            fontFamily: "var(--mono), monospace",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          PG OS · topbar · {Active.label}
        </span>
        <Active.C
          forceOpen
          previewGenre={previewGenre}
          previewPlaying={playing}
        />
      </div>

      {/* Caption */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          maxWidth: 560,
          margin: "40px auto 0",
          padding: "0 20px",
          textAlign: "center",
          fontFamily: "var(--serif), serif",
          color: "var(--fg)",
          textShadow: phase === "day" ? "none" : "0 1px 6px rgba(0,0,0,0.8)",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
          Music Player Lab
        </div>
        <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
          Closed pill (top-right) + open dropdown shown together. Switch
          variants, force a genre look, preview each sky, toggle playing. Pick
          your favorite, or mix (e.g. &quot;V3 dropdown + V2 closed&quot;).
        </div>
      </div>
    </div>
  );
}
