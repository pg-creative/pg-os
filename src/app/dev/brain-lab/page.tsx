"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { THEMES, THEME_BY_ID, DEFAULT_THEME } from "./themes";
import { ThemeProvider } from "./shared/ThemeProvider";
import { AmbientPlayer } from "./shared/AmbientPlayer";
import { SpotifyEmbed } from "./shared/SpotifyEmbed";
import { ScholarStudyVariant } from "./variants/ScholarStudyVariant";
import { SkyWorldVariant } from "./variants/SkyWorldVariant";
import { KodamaGroveVariant } from "./variants/KodamaGroveVariant";
import { ScriptoriumVariant } from "./variants/ScriptoriumVariant";
import { MidnightGospelVariant } from "./variants/MidnightGospelVariant";
import { TableVariant } from "./variants/TableVariant";
import { SwipeDeckVariant } from "./variants/SwipeDeckVariant";
import { SpatialMapVariant } from "./variants/SpatialMapVariant";
import { ChatQueryVariant } from "./variants/ChatQueryVariant";
import { TimelineFeedVariant } from "./variants/TimelineFeedVariant";
import { UX_VARIANTS, AESTHETIC_VARIANTS } from "./themes";

const VARIANT_COMPONENT = {
  // UX-model variants (the round PG asked for)
  table: TableVariant,
  swipe: SwipeDeckVariant,
  map: SpatialMapVariant,
  chat: ChatQueryVariant,
  timeline: TimelineFeedVariant,
  // Thematic-reskin archive (kept live as visual reference)
  "scholar-study": ScholarStudyVariant,
  "sky-world": SkyWorldVariant,
  "kodama-grove": KodamaGroveVariant,
  scriptorium: ScriptoriumVariant,
  "midnight-gospel": MidnightGospelVariant,
} as const;

function LabSwitcher() {
  const params = useSearchParams();
  const id = params.get("theme") ?? params.get("variant") ?? DEFAULT_THEME.id;
  const theme = THEME_BY_ID[id] ?? DEFAULT_THEME;
  const Component =
    VARIANT_COMPONENT[theme.id as keyof typeof VARIANT_COMPONENT] ??
    TableVariant;

  return (
    <ThemeProvider theme={theme}>
      <div className="bl-shell" data-theme={theme.id}>
        <nav className="bl-nav">
          <div className="bl-nav-brand">
            <span className="bl-nav-glyph">◉</span>
            <span className="bl-nav-label">BRAIN LAB</span>
          </div>
          <div className="bl-nav-variants">
            <span className="bl-nav-section">UX</span>
            {UX_VARIANTS.map((t) => (
              <a
                key={t.id}
                href={`?theme=${t.id}`}
                className={`bl-nav-link${theme.id === t.id ? " active" : ""}`}
                title={t.tagline}
              >
                {t.name}
              </a>
            ))}
            <span className="bl-nav-section">archive</span>
            {AESTHETIC_VARIANTS.map((t) => (
              <a
                key={t.id}
                href={`?theme=${t.id}`}
                className={`bl-nav-link bl-nav-link-archive${theme.id === t.id ? " active" : ""}`}
                title={t.tagline}
              >
                {t.name}
              </a>
            ))}
          </div>
          <div className="bl-nav-audio">
            <AmbientPlayer />
            <SpotifyEmbed />
          </div>
          <a className="bl-nav-back" href="/?tab=brain&skip-evening=1">
            ← back to Brain
          </a>
        </nav>
        <main className="bl-stage">
          <Component />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default function BrainLabPage() {
  return (
    <Suspense fallback={<div className="bl-loading">Loading lab…</div>}>
      <LabSwitcher />
    </Suspense>
  );
}
