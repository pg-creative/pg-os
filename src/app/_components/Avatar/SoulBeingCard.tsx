"use client";

import { useEffect, useState } from "react";
import styles from "./avatar.module.css";
import type { AvatarState } from "@/lib/avatar";

interface SoulBeingCardProps {
  state: AvatarState;
  name: string | null;
  onNameChange?: (name: string) => Promise<void>;
  onCustomize?: () => void;
}

/**
 * The soul-being card. A glowing orb with optional aura, companion, hat,
 * and palette. Editable name field. The vibe is kodama / soot-sprite —
 * subtle, breathing, friendly. Not a Fortnite skin.
 */
export function SoulBeingCard({ state, name, onNameChange, onCustomize }: SoulBeingCardProps) {
  const palette = state.palette ?? "dawn";
  const aura = state.aura ?? "sparkle";
  const companion = state.companion ?? null;
  const hat = state.hat ?? null;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");

  useEffect(() => {
    setDraft(name ?? "");
  }, [name]);

  async function commit() {
    if (!onNameChange) {
      setEditing(false);
      return;
    }
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) {
      await onNameChange(trimmed);
    }
    setEditing(false);
  }

  return (
    <section className={styles.card} aria-label="Soul-being avatar">
      <div className={`${styles.stage} ${styles[`palette-${palette}`]}`}>
        <div className={styles.aura} data-kind={aura} aria-hidden="true" />
        <div className={styles.orb} aria-hidden="true" />
        {hat && <div className={styles.hat} data-kind={hat} aria-hidden="true" />}
        {companion && (
          <div className={styles.companion} data-kind={companion} aria-hidden="true" />
        )}
      </div>

      <div className={styles.nameRow}>
        <span className={styles.nameLabel}>Soul-being</span>
        {editing ? (
          <input
            className={styles.nameInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            placeholder="Name your soul-being"
            maxLength={48}
            aria-label="Soul-being name"
          />
        ) : (
          <button
            type="button"
            className={styles.nameInput}
            onClick={() => setEditing(true)}
            style={{ cursor: "text" }}
            aria-label="Edit soul-being name"
          >
            {name || "(unnamed)"}
          </button>
        )}
      </div>

      {onCustomize && (
        <button
          type="button"
          className={styles.editButton}
          onClick={onCustomize}
        >
          Customize
        </button>
      )}
    </section>
  );
}
