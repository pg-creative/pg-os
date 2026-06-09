"use client";
/**
 * Agenda sub-variant bake-off (PG picked the Agenda direction). Same editable
 * grid + agenda rail; 4 layouts of the rail:
 *   list     — clean itinerary + open windows
 *   nownext  — what's happening now, what's next, then the rest
 *   spine    — the day as a vertical scroll (past dimmed, now glows)
 *   periods  — grouped morning / afternoon / evening + summary
 * Switch with ?v= or the floating control. PG picks; winner = default agendaStyle.
 */
import { useEffect, useState } from "react";
import { CalendarView } from "../../_components/views/CalendarView";
import type { AgendaStyle } from "../../_components/views/CalendarView";

const OPTS: { id: AgendaStyle; label: string }[] = [
  { id: "list", label: "Itinerary" },
  { id: "nownext", label: "Now & Next" },
  { id: "spine", label: "Scroll spine" },
  { id: "periods", label: "Periods" },
];

export default function CalendarLab() {
  const [v, setV] = useState<AgendaStyle>("list");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get(
      "v",
    ) as AgendaStyle | null;
    if (q && OPTS.some((o) => o.id === q)) setV(q);
  }, []);
  const pick = (next: AgendaStyle) => {
    setV(next);
    const url = new URL(window.location.href);
    url.searchParams.set("v", next);
    window.history.replaceState(null, "", url.toString());
  };
  return (
    <>
      <CalendarView overviewVariant="agenda" agendaStyle={v} demo />
      <div
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 100,
          display: "flex",
          gap: 4,
          background: "rgba(20,14,6,0.85)",
          padding: 5,
          borderRadius: 999,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.06em",
        }}
      >
        {OPTS.map((o) => (
          <button
            key={o.id}
            onClick={() => pick(o.id)}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "8px 13px",
              borderRadius: 999,
              textTransform: "uppercase",
              background: v === o.id ? "#F0C060" : "transparent",
              color: v === o.id ? "#1a160f" : "#d8c79a",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}
