"use client";

/**
 * Aesthetic Lab — 5-direction bake-off for the PG OS redesign (Kitsu era).
 *
 * Stage A of the design-lab program: pick the DIRECTION here on a representative
 * Home slice (chrome + hero + cards + activity + CTA), each time-responsive
 * (day/dusk/night). Then we go section-by-section in the winner.
 *
 * Directions (research-grounded, 2026-05-20):
 *   1. nioh     — dark sumi-e + kodama + kitsune foxfire + kintsugi gold
 *   2. ukiyoe   — woodblock: flat planes, bold outlines, washi grain, waves
 *   3. zen      — modern shrine / Muji minimalism: ma, hairlines, one vermilion
 *   4. ghibli   — evolved cel-shaded golden-hour (current DNA, richer)
 *   5. onmyoji  — Heian mysticism: ofuda, wax seals, Seiman sigil, gold foil
 *
 * Backdrops here are procedural (CSS/SVG). The WINNER gets real painted hero
 * art via Midjourney before it ships.
 */

import { useState } from "react";

type Time = "day" | "dusk" | "night";
type Pal = {
  bg: string;
  bg2: string;
  surface: string;
  fg: string;
  muted: string;
  accent: string;
  accent2: string;
  border: string;
};
type Theme = {
  key: string;
  label: string;
  jp: string;
  blurb: string;
  fonts: { display: string; body: string; mono: string };
  radius: number;
  pal: Record<Time, Pal>;
};

const THEMES: Theme[] = [
  {
    key: "nioh",
    label: "Nioh · Kodama · Kitsune",
    jp: "仁王",
    blurb: "Dark sumi-e ink, drifting kodama, foxfire embers, kintsugi gold.",
    fonts: {
      display: "'Noto Serif JP', Georgia, serif",
      body: "'IBM Plex Sans', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    radius: 6,
    pal: {
      day: {
        bg: "#F5F3EE",
        bg2: "#EBE7DE",
        surface: "#FFFBF7",
        fg: "#1A1410",
        muted: "#6B6158",
        accent: "#C97C3A",
        accent2: "#8B7355",
        border: "rgba(26,20,16,0.14)",
      },
      dusk: {
        bg: "#2A251F",
        bg2: "#221E18",
        surface: "#3D3530",
        fg: "#E8E3D8",
        muted: "#A69D92",
        accent: "#E8A855",
        accent2: "#D4A574",
        border: "rgba(232,227,216,0.16)",
      },
      night: {
        bg: "#0F0D0A",
        bg2: "#080706",
        surface: "#1C1814",
        fg: "#D4CEC1",
        muted: "#8B8278",
        accent: "#FFC966",
        accent2: "#B8860B",
        border: "rgba(212,206,193,0.14)",
      },
    },
  },
  {
    key: "ukiyoe",
    label: "Ukiyo-e Woodblock",
    jp: "浮世絵",
    blurb: "Flat color planes, bold outlines, washi grain, Great-Wave motifs.",
    fonts: {
      display: "'Shippori Mincho', 'Noto Serif JP', serif",
      body: "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    radius: 2,
    pal: {
      day: {
        bg: "#FFFAF0",
        bg2: "#F3E9D6",
        surface: "#FFFDF8",
        fg: "#1B2A4A",
        muted: "#5A6B86",
        accent: "#D6452F",
        accent2: "#2B4C7E",
        border: "#1B2A4A",
      },
      dusk: {
        bg: "#1B3A5B",
        bg2: "#15314D",
        surface: "#23496E",
        fg: "#F4E9D6",
        muted: "#B7C4D6",
        accent: "#FF6B35",
        accent2: "#E8C36B",
        border: "#0E2236",
      },
      night: {
        bg: "#10172B",
        bg2: "#0A1020",
        surface: "#1A2440",
        fg: "#F0E6CF",
        muted: "#9AA7C2",
        accent: "#FFD23F",
        accent2: "#E8643C",
        border: "#2A375C",
      },
    },
  },
  {
    key: "zen",
    label: "Modern Shrine · Zen-min",
    jp: "禅",
    blurb: "Ma (active emptiness), hairline rules, one torii-vermilion accent.",
    fonts: {
      display: "'Crimson Text', Georgia, serif",
      body: "'Inter', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    radius: 0,
    pal: {
      day: {
        bg: "#FAF8F5",
        bg2: "#F2EFEA",
        surface: "#FFFFFF",
        fg: "#2A2A28",
        muted: "#7C7A74",
        accent: "#C41E3A",
        accent2: "#8A8780",
        border: "rgba(42,42,40,0.12)",
      },
      dusk: {
        bg: "#E8E3DD",
        bg2: "#DCD6CE",
        surface: "#F3EFE9",
        fg: "#2A2A28",
        muted: "#6E6B64",
        accent: "#C41E3A",
        accent2: "#A8825A",
        border: "rgba(42,42,40,0.16)",
      },
      night: {
        bg: "#16140F",
        bg2: "#100E0A",
        surface: "#211E18",
        fg: "#E8E4DC",
        muted: "#938E84",
        accent: "#E0556B",
        accent2: "#C9A961",
        border: "rgba(232,228,220,0.12)",
      },
    },
  },
  {
    key: "ghibli",
    label: "Evolved Ghibli Cel",
    jp: "宮",
    blurb:
      "Golden-hour light leaks, cel-banding, particle haze, jewel accents.",
    fonts: {
      display: "Georgia, 'Times New Roman', serif",
      body: "'Outfit', 'Inter', sans-serif",
      mono: "'IBM Plex Mono', monospace",
    },
    radius: 14,
    pal: {
      day: {
        bg: "#DCE8F0",
        bg2: "#C9DCEA",
        surface: "#FBF4E6",
        fg: "#22344A",
        muted: "#5C7088",
        accent: "#E07A52",
        accent2: "#3F6FA8",
        border: "rgba(34,52,74,0.14)",
      },
      dusk: {
        bg: "#1C3350",
        bg2: "#142844",
        surface: "#22405F",
        fg: "#F0E6D2",
        muted: "#AFC0D6",
        accent: "#FF6347",
        accent2: "#E3C16F",
        border: "rgba(240,230,210,0.16)",
      },
      night: {
        bg: "#0B1730",
        bg2: "#060F22",
        surface: "#142540",
        fg: "#EDE6D2",
        muted: "#9FB0CC",
        accent: "#E3C16F",
        accent2: "#807EA8",
        border: "rgba(237,230,210,0.13)",
      },
    },
  },
  {
    key: "onmyoji",
    label: "Onmyōji · Heian Mystic",
    jp: "陰陽師",
    blurb:
      "Ofuda talismans, wax-seal stamps, Seiman sigil, gold foil. Kitsu's lore.",
    fonts: {
      display: "'Noto Serif JP', Georgia, serif",
      body: "'Noto Sans JP', system-ui, sans-serif",
      mono: "'IBM Plex Mono', monospace",
    },
    radius: 3,
    pal: {
      day: {
        bg: "#F2E7D2",
        bg2: "#E6D7BC",
        surface: "#FBF5E8",
        fg: "#2C2118",
        muted: "#6E5C45",
        accent: "#B5341F",
        accent2: "#B08A2E",
        border: "rgba(44,33,24,0.18)",
      },
      dusk: {
        bg: "#3E2723",
        bg2: "#321F1C",
        surface: "#4A322C",
        fg: "#F2E4CE",
        muted: "#B79C82",
        accent: "#FF6B6B",
        accent2: "#E8B84B",
        border: "rgba(242,228,206,0.16)",
      },
      night: {
        bg: "#0F1419",
        bg2: "#0A0E12",
        surface: "#1A222C",
        fg: "#ECE2CC",
        muted: "#8E9AA8",
        accent: "#E03A52",
        accent2: "#FFD23F",
        border: "rgba(236,226,204,0.14)",
      },
    },
  },
];

const TIMES: Time[] = ["day", "dusk", "night"];

export default function AestheticLab() {
  const [active, setActive] = useState(0);
  const [time, setTime] = useState<Time>("night");
  const t = THEMES[active];
  const p = t.pal[time];

  const cssVars: React.CSSProperties = {
    // @ts-expect-error custom props
    "--bg": p.bg,
    "--bg2": p.bg2,
    "--surface": p.surface,
    "--fg": p.fg,
    "--muted": p.muted,
    "--accent": p.accent,
    "--accent2": p.accent2,
    "--border": p.border,
    "--radius": `${t.radius}px`,
    "--display": t.fonts.display,
    "--body": t.fonts.body,
    "--mono": t.fonts.mono,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#eee",
        fontFamily: "'JetBrains Mono', monospace",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700;900&family=Noto+Sans+JP:wght@400;500&family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&family=Outfit:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap');

        @keyframes drift { 0%{transform:translate(0,0)} 50%{transform:translate(14px,-22px)} 100%{transform:translate(0,0)} }
        @keyframes ember { 0%{transform:translateY(0);opacity:0} 15%{opacity:.9} 100%{transform:translateY(-120px);opacity:0} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes seal-draw { to { stroke-dashoffset: 0; } }
        .al-slice { position:relative; overflow:hidden; }
        .al-card { transition: transform .18s ease, box-shadow .18s ease; }
        .al-card:hover { transform: translateY(-3px); }
        /* ukiyo-e registration offset on hover */
        .ukiyoe .al-card:hover { box-shadow: 3px 3px 0 var(--accent), 6px 6px 0 var(--accent2); }
        .al-cta:hover { filter: brightness(1.08); }
      `}</style>

      {/* control rail */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 18px",
          background: "rgba(10,10,10,.92)",
          borderBottom: "1px solid #222",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ color: "#fff", fontSize: 13, letterSpacing: ".1em" }}>
          AESTHETIC LAB
        </strong>
        <span style={{ color: "#777", fontSize: 11 }}>
          pick a direction — each is time-responsive
        </span>
        <span style={{ flex: 1 }} />
        {THEMES.map((th, i) => (
          <button
            key={th.key}
            onClick={() => setActive(i)}
            style={{
              padding: "6px 11px",
              borderRadius: 6,
              border: `1px solid ${i === active ? "#fff" : "#333"}`,
              background: i === active ? "#fff" : "transparent",
              color: i === active ? "#000" : "#aaa",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {i + 1}. {th.label}
          </button>
        ))}
        <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
          {TIMES.map((tm) => (
            <button
              key={tm}
              onClick={() => setTime(tm)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: `1px solid ${tm === time ? "#FFD23F" : "#333"}`,
                background:
                  tm === time ? "rgba(255,210,63,.15)" : "transparent",
                color: tm === time ? "#FFD23F" : "#999",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
                textTransform: "uppercase",
              }}
            >
              {tm}
            </button>
          ))}
        </div>
      </div>

      {/* caption */}
      <div style={{ padding: "10px 22px", color: "#888", fontSize: 12 }}>
        <span style={{ color: "#fff" }}>
          {t.jp} {t.label}
        </span>{" "}
        · {t.blurb} <span style={{ color: "#666" }}>· {time}</span>
      </div>

      {/* themed preview slice */}
      <div style={{ padding: "0 22px 60px" }}>
        <div
          className={`al-slice ${t.key}`}
          style={{
            ...cssVars,
            maxWidth: 1180,
            margin: "0 auto",
            background: "var(--bg)",
            color: "var(--fg)",
            fontFamily: "var(--body)",
            borderRadius: 12,
            border: "1px solid var(--border)",
            padding: "0",
            minHeight: 620,
            boxShadow: "0 30px 80px rgba(0,0,0,.5)",
          }}
        >
          <HeroImg theme={t} time={time} />
          <Decor theme={t.key} time={time} />
          <Slice theme={t} time={time} />
        </div>
      </div>
    </div>
  );
}

/* ── Painted hero backdrop (Midjourney, visual-style; per direction) ─────── */
// Which of the 4 MJ candidates to use per direction (tuned after review).
const HERO_PICK: Record<string, number> = {
  nioh: 0,
  ukiyoe: 0,
  zen: 0,
  ghibli: 0,
  onmyoji: 0,
};
function HeroImg({ theme, time }: { theme: Theme; time: Time }) {
  const src = `/art/aesthetic-2026-05-20/${theme.key}-hero_${HERO_PICK[theme.key] ?? 0}.png`;
  // scrim: painting shows at the top, dissolves into the solid theme bg so text
  // stays legible. Lighter themes (day/zen) get a gentler, paper-toned scrim.
  const dark = time === "night" || (time === "dusk" && theme.key !== "zen");
  return (
    <div
      style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url('${src}')`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: theme.key === "zen" ? 0.5 : 0.85,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: dark
            ? "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, var(--bg) 78%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, var(--bg) 80%)",
        }}
      />
    </div>
  );
}

/* ── Representative Home slice (re-skinned per theme via CSS vars) ───────── */
function Slice({ theme, time }: { theme: Theme; time: Time }) {
  const isOnmyoji = theme.key === "onmyoji";
  const isZen = theme.key === "zen";
  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        padding: isZen ? "56px 64px" : "32px 38px",
      }}
    >
      {/* chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: isZen ? 64 : 34,
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: ".22em",
            textTransform: "uppercase",
            color: "var(--accent)",
          }}
        >
          ◆ PG OS
        </span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--muted)",
            letterSpacing: ".15em",
          }}
        >
          {theme.jp} · {time.toUpperCase()}
        </span>
        <span style={{ flex: 1 }} />
        <Tab label="HOME" active theme={theme} />
        <Tab label="HABITS" theme={theme} />
        <Tab label="PROJECTS" theme={theme} />
        <Tab label="COCKPIT" theme={theme} />
      </div>

      {/* hero */}
      <div style={{ marginBottom: isZen ? 56 : 30, maxWidth: 720 }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 12,
          }}
        >
          {greet(time)} · Kitsu is watching the fleet
        </div>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontSize: isZen ? 40 : 48,
            fontWeight: 700,
            lineHeight: 1.05,
            margin: "0 0 14px",
            letterSpacing: "-0.01em",
          }}
        >
          {heroLine(theme.key)}
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: "var(--muted)",
            margin: 0,
            maxWidth: 560,
          }}
        >
          Three sessions live, one waiting on your call. The night is quiet — a
          good time to ship the thing you keep circling.
        </p>
      </div>

      {/* card row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: isZen ? 28 : 18,
          marginBottom: isZen ? 48 : 24,
        }}
      >
        <Card
          theme={theme}
          title="personal-os"
          meta="cockpit · 2d"
          stat="48% ctx"
          body="mcp_claude-in-chrome__browser_batch"
          isOnmyoji={isOnmyoji}
        />
        <Card
          theme={theme}
          title="metrasens"
          meta="signal-hub · 4d"
          stat="blocked"
          body="MRE bucket — UPGRADE or CURRENT?"
          isOnmyoji={isOnmyoji}
          alert
        />
      </div>

      {/* activity list */}
      <div
        style={{
          borderTop: isZen ? "1px solid var(--border)" : "none",
          paddingTop: isZen ? 28 : 0,
          marginBottom: 26,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: 14,
          }}
        >
          Recent activity
        </div>
        {[
          ["09:58", "legibility foundation shipped", "+711 −0"],
          ["09:24", "party mode — Kitsu sings first", "+180 −44"],
          ["08:51", "fox head reframed", "+12 −9"],
        ].map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "9px 0",
              borderBottom: `1px solid var(--border)`,
              fontSize: 13,
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                color: "var(--muted)",
                fontSize: 12,
              }}
            >
              {row[0]}
            </span>
            <span style={{ flex: 1, color: "var(--fg)" }}>{row[1]}</span>
            <span
              style={{
                fontFamily: "var(--mono)",
                color: "var(--accent2)",
                fontSize: 12,
              }}
            >
              {row[2]}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        className="al-cta"
        style={{
          fontFamily: "var(--mono)",
          fontSize: 13,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          padding: "12px 22px",
          borderRadius: "var(--radius)",
          border: `1px solid var(--accent)`,
          background: theme.key === "zen" ? "transparent" : "var(--accent)",
          color: theme.key === "zen" ? "var(--accent)" : pickInk(theme, time),
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        + New session →
      </button>
    </div>
  );
}

function Tab({
  label,
  active,
  theme,
}: {
  label: string;
  active?: boolean;
  theme: Theme;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--mono)",
        fontSize: 11,
        letterSpacing: ".15em",
        color: active ? "var(--fg)" : "var(--muted)",
        borderBottom: active
          ? `2px solid var(--accent)`
          : "2px solid transparent",
        paddingBottom: 3,
      }}
    >
      {label}
    </span>
  );
}

function Card({
  theme,
  title,
  meta,
  stat,
  body,
  isOnmyoji,
  alert,
}: {
  theme: Theme;
  title: string;
  meta: string;
  stat: string;
  body: string;
  isOnmyoji?: boolean;
  alert?: boolean;
}) {
  return (
    <div
      className="al-card"
      style={{
        background: "var(--surface)",
        border: `${theme.key === "ukiyoe" ? 2 : 1}px solid var(--border)`,
        borderRadius: "var(--radius)",
        padding: "18px 20px",
        position: "relative",
        transform: isOnmyoji ? "rotate(-0.6deg)" : undefined,
        boxShadow:
          theme.key === "ghibli" ? "0 10px 30px rgba(0,0,0,.18)" : "none",
      }}
    >
      {isOnmyoji && (
        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 26,
            height: 26,
            borderRadius: "50%",
            border: "1.5px solid var(--accent)",
            color: "var(--accent)",
            fontSize: 13,
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--display)",
          }}
        >
          狐
        </span>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--display)",
            fontSize: 19,
            fontWeight: 700,
            color: "var(--fg)",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--muted)",
          }}
        >
          {meta}
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: alert ? "var(--accent)" : "var(--accent2)",
            textTransform: "uppercase",
            letterSpacing: ".08em",
          }}
        >
          {stat}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 12.5,
          color: "var(--muted)",
          lineHeight: 1.5,
        }}
      >
        {body}
      </div>
    </div>
  );
}

/* ── Per-direction decorative layers ────────────────────────────────────── */
function Decor({ theme, time }: { theme: string; time: Time }) {
  if (theme === "nioh") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* kodama orbs */}
        {[
          [12, 70, 18, 14],
          [78, 30, 12, 9],
          [55, 82, 22, 17],
          [88, 64, 9, 11],
        ].map((o, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${o[0]}%`,
              top: `${o[1]}%`,
              width: o[2],
              height: o[2],
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 40% 35%, rgba(255,255,255,.5), rgba(255,255,255,.05))",
              animation: `drift ${o[3]}s ease-in-out infinite`,
              filter: "blur(.4px)",
            }}
          />
        ))}
        {/* foxfire embers */}
        {[20, 35, 64, 80].map((x, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              bottom: 0,
              width: 5,
              height: 5,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, #FFC966, rgba(255,140,40,0))",
              animation: `ember ${5 + i}s linear ${i * 1.2}s infinite`,
            }}
          />
        ))}
        {/* kintsugi gold seam */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.5,
          }}
          preserveAspectRatio="none"
        >
          <path
            d="M0,120 Q200,90 380,160 T760,140 T1140,180"
            stroke="var(--accent)"
            strokeWidth="1.2"
            fill="none"
            opacity="0.5"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              time === "day"
                ? "none"
                : "radial-gradient(120% 80% at 80% 0%, rgba(255,201,102,.10), transparent 55%)",
          }}
        />
      </div>
    );
  }
  if (theme === "ukiyoe") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        {/* washi grain */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.06,
            mixBlendMode: "multiply",
          }}
        >
          <filter id="washi">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#washi)" />
        </svg>
        {/* great-wave divider */}
        <svg
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 70,
            opacity: 0.5,
          }}
        >
          <path
            d="M0,40 C120,10 180,70 300,40 C420,10 480,70 600,40 C720,10 780,70 900,40 C1020,10 1080,70 1200,40 L1200,80 L0,80 Z"
            fill="var(--accent2)"
            opacity="0.3"
          />
        </svg>
      </div>
    );
  }
  if (theme === "ghibli") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        {/* golden-hour light leak */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, transparent 0%, rgba(255,214,165,0.16) 100%)",
            mixBlendMode: "screen",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-5%",
            width: 380,
            height: 380,
            background:
              "radial-gradient(circle, rgba(255,214,165,.35), transparent 60%)",
            filter: "blur(20px)",
          }}
        />
        {/* haze particles */}
        {[15, 40, 62, 85, 30, 72].map((x, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${(i * 17) % 90}%`,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "rgba(255,240,200,.6)",
              animation: `drift ${10 + i * 2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    );
  }
  if (theme === "onmyoji") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* spell circle */}
        <svg
          viewBox="0 0 200 200"
          style={{
            position: "absolute",
            top: -40,
            right: -30,
            width: 280,
            height: 280,
            opacity: 0.18,
          }}
        >
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="var(--accent2)"
            strokeWidth="1"
          />
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="var(--accent2)"
            strokeWidth="0.6"
            strokeDasharray="4 4"
          />
          {/* Seiman pentagram */}
          <path
            d="M100,20 L123,160 L11,72 L189,72 L77,160 Z"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.2"
            style={{
              transformOrigin: "100px 100px",
              animation: "spin 80s linear infinite",
            }}
          />
        </svg>
        {/* gold-foil corner shimmer */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 4,
            background:
              "linear-gradient(90deg, transparent, var(--accent2), transparent)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              time === "night"
                ? "radial-gradient(100% 70% at 50% 0%, rgba(255,210,63,.06), transparent 60%)"
                : "none",
          }}
        />
      </div>
    );
  }
  return null; // zen — intentional emptiness
}

/* ── helpers ────────────────────────────────────────────────────────────── */
function greet(time: Time) {
  return time === "day"
    ? "Good morning"
    : time === "dusk"
      ? "Good evening"
      : "Late night";
}
function heroLine(key: string) {
  switch (key) {
    case "nioh":
      return "The fleet holds the line.";
    case "ukiyoe":
      return "Ride the wave, don't fight it.";
    case "zen":
      return "Less, but better.";
    case "ghibli":
      return "A good night to ship.";
    case "onmyoji":
      return "The spirits are favorable.";
    default:
      return "Welcome back.";
  }
}
function pickInk(theme: Theme, time: Time) {
  // readable text color on the accent-filled CTA
  const p = theme.pal[time];
  return p.bg.startsWith("#0") || p.bg.startsWith("#1") || p.bg.startsWith("#2")
    ? "#14110c"
    : "#FFF8EC";
}
