"use client";

/**
 * WorldStage — the client half of a world: the slot, the canvas, the panel.
 *
 * EXTENDS: `_components/emaki/EmakiBackdrop.tsx`, which owns the fixed inset-0 z0
 * slot on every route and here runs in world mode. The canvas mounts as its
 * children so the scene never opens a second slot.
 *
 * Prose never travels as data. The server component renders every page's body
 * into `panels` as ready-made React nodes; this component only decides WHICH one
 * is visible. Nothing text-first: they are all closed until PG dwells.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { EmakiBackdrop } from "../../_components/emaki/EmakiBackdrop";
import { WorldCanvas } from "../_scene/WorldCanvas";
import type { SceneManifest } from "../_scene/types";

export function WorldStage({
  manifest,
  panels,
}: {
  manifest: SceneManifest;
  /** Server-rendered page bodies, keyed by page id. */
  panels: Record<string, ReactNode>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [source, setSource] = useState<"a" | "b">("a");
  const [everScrolled, setEverScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 40) setEverScrolled(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the panel. The world stays where it was.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onDwell = useCallback((id: string | null) => setOpen(id), []);

  const current = open ? manifest.objects.find((o) => o.id === open) : null;

  return (
    <>
      <EmakiBackdrop
        world={{
          phase: manifest.phase,
          hero: source === "b" && manifest.heroAlt ? manifest.heroAlt : manifest.hero,
          lqip: manifest.lqip,
          sky: {
            top: manifest.preset.sky.top,
            mid: manifest.preset.sky.mid,
            horizon: manifest.preset.sky.horizon,
          },
        }}
      >
        <WorldCanvas
          manifest={manifest}
          source={source}
          onSource={setSource}
          onDwell={onDwell}
        />
      </EmakiBackdrop>

      {/* The scroll track the scene measures itself against. */}
      <div id="cosmos-scroll" className="cosmos-scroll" aria-hidden />

      {/* z3, DOM, in the world's register. Present in the markup, closed until
          dwelt on: prose appears only when you have held your attention on the
          thing that carries it. */}
      <div
        className="cosmos-panel"
        data-open={current ? "true" : "false"}
        role="dialog"
        aria-modal="false"
        aria-hidden={current ? undefined : true}
        aria-label={current?.title}
      >
        {current && (
          <>
            <p className="cosmos-panel-eyebrow">{current.type}</p>
            <h2 className="cosmos-panel-title">{current.title}</h2>
            <div className="cosmos-panel-body">{panels[current.id]}</div>
          </>
        )}
      </div>

      <p className="cosmos-hint" data-hidden={everScrolled ? "true" : "false"}>
        scroll · rest on a thing to open it
      </p>
    </>
  );
}
