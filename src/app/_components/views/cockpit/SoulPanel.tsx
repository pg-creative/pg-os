"use client";

/**
 * SoulPanel — view and edit Kitsu's soul files in the OS.
 * Fetches GET /api/kitsu/soul on mount, renders each file in a readable block,
 * and allows PATCHing the 4 editable files (IDENTITY, SOUL, USER, MEMORY).
 * decision-log is read-only and append-only.
 */

import { useEffect, useState } from "react";
import { BentoBox } from "../../bento/BentoBox";
import { useEmaki } from "../../bento/emakiContext";

type SoulFiles = {
  IDENTITY: string;
  SOUL: string;
  USER: string;
  MEMORY: string;
  "decision-log": string;
};

type TabKey = keyof SoulFiles;

const TABS: { key: TabKey; label: string; editable: boolean; kanji: string }[] =
  [
    { key: "IDENTITY", label: "Identity", editable: true, kanji: "魂" },
    { key: "SOUL", label: "Soul", editable: true, kanji: "心" },
    { key: "USER", label: "User", editable: true, kanji: "人" },
    { key: "MEMORY", label: "Memory", editable: true, kanji: "記" },
    { key: "decision-log", label: "Log", editable: false, kanji: "歴" },
  ];

type SaveState = "idle" | "saving" | "saved" | "error";

export function SoulPanel() {
  const { tk } = useEmaki();
  const [files, setFiles] = useState<SoulFiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("SOUL");
  const [editContent, setEditContent] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const r = await fetch("/api/kitsu/soul");
        if (r.ok) {
          const data = (await r.json()) as { files: SoulFiles };
          setFiles(data.files);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const tabMeta = TABS.find((t) => t.key === activeTab)!;
  const currentContent = files?.[activeTab] ?? "";

  function startEdit() {
    setEditContent(currentContent);
    setEditing(true);
    setSaveState("idle");
  }

  function cancelEdit() {
    setEditing(false);
    setSaveState("idle");
  }

  async function saveEdit() {
    if (!files) return;
    setSaveState("saving");
    try {
      const r = await fetch("/api/kitsu/soul", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: activeTab, content: editContent }),
      });
      if (r.ok) {
        setFiles({ ...files, [activeTab]: editContent });
        setSaveState("saved");
        setEditing(false);
        setTimeout(() => setSaveState("idle"), 2000);
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
  }

  const monoStyle: React.CSSProperties = {
    fontFamily: "var(--mono), ui-monospace, monospace",
    fontSize: "var(--text-xs)",
  };

  return (
    <BentoBox cols={12} eyebrow="03 // KITSU SOUL" kanji="狐">
      {/* tab strip */}
      <div
        role="tablist"
        aria-label="Kitsu soul files"
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        {TABS.map((t) => {
          const active = t.key === activeTab;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              aria-controls={`soul-panel-${t.key}`}
              onClick={() => {
                setActiveTab(t.key);
                setEditing(false);
                setSaveState("idle");
              }}
              style={{
                ...monoStyle,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: active
                  ? "rgba(214,163,103,.18)"
                  : "rgba(0,0,0,0.14)",
                border: `1px solid ${active ? tk.accent : tk.divider}`,
                borderRadius: 6,
                color: active ? tk.accent : tk.textMuted,
                padding: "4px 11px",
                cursor: "pointer",
                transition: "all 140ms ease",
              }}
            >
              {t.label}
              <span
                aria-hidden
                style={{ marginLeft: 5, opacity: 0.45, fontSize: "0.85em" }}
              >
                {t.kanji}
              </span>
            </button>
          );
        })}
      </div>

      {/* content area */}
      <div
        id={`soul-panel-${activeTab}`}
        role="tabpanel"
        aria-label={tabMeta.label}
      >
        {loading ? (
          <div
            style={{
              ...monoStyle,
              color: tk.textMuted,
              fontStyle: "italic",
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            reading Kitsu soul files...
          </div>
        ) : editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              aria-label={`Edit ${tabMeta.label}`}
              rows={16}
              style={{
                ...monoStyle,
                width: "100%",
                background: "rgba(0,0,0,0.22)",
                border: `1px solid ${tk.accent}`,
                borderRadius: 8,
                padding: "12px 14px",
                color: tk.textPrimary,
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => void saveEdit()}
                disabled={saveState === "saving"}
                aria-label="Save soul file"
                style={{
                  ...monoStyle,
                  background: "transparent",
                  border: `1px solid ${tk.accent}`,
                  borderRadius: 6,
                  color: tk.accent,
                  padding: "5px 14px",
                  cursor: saveState === "saving" ? "default" : "pointer",
                  opacity: saveState === "saving" ? 0.6 : 1,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {saveState === "saving" ? "saving..." : "save"}
              </button>
              <button
                onClick={cancelEdit}
                aria-label="Cancel edit"
                style={{
                  ...monoStyle,
                  background: "transparent",
                  border: `1px solid ${tk.divider}`,
                  borderRadius: 6,
                  color: tk.textMuted,
                  padding: "5px 14px",
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                cancel
              </button>
              {saveState === "error" && (
                <span
                  style={{
                    ...monoStyle,
                    color: "#B8536F",
                    fontSize: "var(--text-2xs)",
                  }}
                >
                  save failed
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* action bar */}
            <div
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              {tabMeta.editable && (
                <button
                  onClick={startEdit}
                  aria-label={`Edit ${tabMeta.label}`}
                  style={{
                    ...monoStyle,
                    background: "transparent",
                    border: `1px solid ${tk.divider}`,
                    borderRadius: 6,
                    color: tk.textMuted,
                    padding: "4px 12px",
                    cursor: "pointer",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontSize: "var(--text-2xs)",
                  }}
                >
                  edit
                </button>
              )}
              {!tabMeta.editable && (
                <span
                  style={{
                    ...monoStyle,
                    fontSize: "var(--text-2xs)",
                    color: tk.textMuted,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    opacity: 0.6,
                  }}
                >
                  read-only
                </span>
              )}
              {saveState === "saved" && (
                <span
                  style={{
                    ...monoStyle,
                    fontSize: "var(--text-2xs)",
                    color: "#7C9A6E",
                  }}
                >
                  saved
                </span>
              )}
            </div>

            {/* markdown content rendered in a scrollable mono block */}
            <div
              style={{
                ...monoStyle,
                background: "rgba(0,0,0,0.16)",
                border: `1px solid ${tk.divider}`,
                borderRadius: 8,
                padding: "14px 16px",
                color: tk.textSub,
                lineHeight: 1.7,
                maxHeight: 340,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {currentContent || (
                <span style={{ opacity: 0.4, fontStyle: "italic" }}>
                  (empty)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </BentoBox>
  );
}
