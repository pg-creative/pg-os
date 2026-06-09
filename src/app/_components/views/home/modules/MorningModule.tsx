"use client";

/**
 * MorningModule — "did you write today?" glance tile.
 * Fetches /api/journal/history?days=1 to check for a today entry.
 * Tapping opens the Morning tab.
 */

import { useState, useEffect } from "react";
import { BentoBox } from "../../../bento/BentoBox";
import { useActiveTab } from "../../../useActiveTab";

interface JournalEntry {
  date?: string;
  created_at?: string;
  content?: string;
  mood?: number;
}

interface JournalResp {
  entries?: JournalEntry[];
  error?: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MorningModule({ cols = 6 }: { cols?: number }) {
  const { setActive } = useActiveTab();
  const [loading, setLoading] = useState(true);
  const [writtenToday, setWrittenToday] = useState(false);
  const [snippet, setSnippet] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/journal/history?days=1")
      .then((r) => r.json())
      .then((d: JournalResp) => {
        if (cancelled) return;
        const today = todayStr();
        const entry = (d.entries ?? []).find((e) => {
          const ds = e.date ?? e.created_at ?? "";
          return ds.startsWith(today);
        });
        setWrittenToday(!!entry);
        if (entry?.content) {
          setSnippet(
            entry.content.slice(0, 80).trim() +
              (entry.content.length > 80 ? "..." : ""),
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hour = new Date().getHours();
  const prompt =
    hour < 10
      ? "Start your morning pages"
      : hour < 14
        ? "Did you write this morning?"
        : "Open journal";

  return (
    <BentoBox
      cols={cols}
      eyebrow="Morning"
      kanji="朝"
      count={writtenToday ? "written" : undefined}
      onClick={() => setActive("morning")}
    >
      {loading ? (
        <span style={{ opacity: 0.45, fontSize: 13 }}>Loading...</span>
      ) : writtenToday ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              opacity: 0.55,
              color: "#34D399",
            }}
          >
            Written today
          </div>
          {snippet && (
            <div
              style={{
                fontSize: 14,
                fontStyle: "italic",
                opacity: 0.7,
                lineHeight: 1.5,
              }}
            >
              &ldquo;{snippet}&rdquo;
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              opacity: 0.55,
            }}
          >
            Not yet written
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, opacity: 0.8 }}>
            {prompt} &rsaquo;
          </div>
        </div>
      )}
    </BentoBox>
  );
}
