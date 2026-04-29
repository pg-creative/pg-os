"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./avatar.module.css";
import { NamingSheet } from "./NamingSheet";
import type { AvatarState } from "@/lib/avatar";

interface SoulBeingCardProps {
  state: AvatarState;
  name: string | null;
  onNameChange?: (name: string) => Promise<void>;
  onCustomize?: () => void;
}

/**
 * The soul-being card. A glowing orb with optional aura, companion, hat,
 * and palette. Shows name with inline edit affordance (pencil icon or
 * tappable "(unnamed)" text). Auto-prompts NamingSheet on first card view
 * per session when name is null (unless user already skipped this session).
 */
export function SoulBeingCard({ state, name, onNameChange, onCustomize }: SoulBeingCardProps) {
  const palette = state.palette ?? "dawn";
  const aura = state.aura ?? "sparkle";
  const companion = state.companion ?? null;
  const hat = state.hat ?? null;

  const [namingOpen, setNamingOpen] = useState(false);
  const [localName, setLocalName] = useState(name);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoPrompted = useRef(false);

  // Sync external name changes in
  useEffect(() => {
    setLocalName(name);
  }, [name]);

  // Auto-prompt NamingSheet on first view when name is null
  useEffect(() => {
    if (hasAutoPrompted.current) return;
    if (localName !== null) return;
    hasAutoPrompted.current = true;
    // Don't auto-prompt if user already skipped this session
    try {
      if (typeof window !== "undefined" && localStorage.getItem("pgos-soul-naming-skipped")) {
        return;
      }
    } catch (_) {}
    // Small delay so the card renders first
    const t = setTimeout(() => setNamingOpen(true), 400);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(newName: string) {
    if (onNameChange) {
      await onNameChange(newName);
    }
    setLocalName(newName);
    setNamingOpen(false);
    showToast(`${newName} is listening.`);
  }

  function handleSkip() {
    setNamingOpen(false);
  }

  // Long-press handlers for the name text (when named)
  function startLongPress() {
    const t = setTimeout(() => {
      setNamingOpen(true);
    }, 500);
    setLongPressTimer(t);
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }

  return (
    <>
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

          {localName === null ? (
            // Unnamed — tappable muted text → opens NamingSheet
            <button
              type="button"
              className={styles.avNameUnnamed}
              onClick={() => setNamingOpen(true)}
              aria-label="Name your soul-being"
            >
              (unnamed)
            </button>
          ) : (
            // Named — name text + pencil affordance
            <span className={styles.avNameRow}>
              <span
                className={styles.avNameText}
                onPointerDown={startLongPress}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
              >
                {localName}
              </span>
              <button
                type="button"
                className={styles.avNameEditBtn}
                onClick={() => setNamingOpen(true)}
                aria-label="Edit soul-being name"
              >
                {/* SVG pencil — inline, no import */}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  fill="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M9.3 1.3a1.5 1.5 0 0 1 2.12 2.12L4.12 10.7 1 11.7l1-3.12L9.3 1.3Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </span>
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

      {namingOpen && (
        <NamingSheet
          currentName={localName}
          onSave={handleSave}
          onSkip={handleSkip}
        />
      )}
    </>
  );
}

/* ---------- Toast helper ---------- */

function showToast(message: string) {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.style.cssText = [
    "position:fixed",
    "bottom:88px",
    "left:50%",
    "transform:translateX(-50%)",
    "background:rgba(30,22,12,0.92)",
    "color:#f5e9d6",
    "font-size:14px",
    "font-style:italic",
    "padding:10px 20px",
    "border-radius:999px",
    "border:1px solid rgba(218,165,90,0.4)",
    "backdrop-filter:blur(8px)",
    "z-index:9999",
    "white-space:nowrap",
    "pointer-events:none",
    "opacity:0",
    "transition:opacity 220ms ease",
  ].join(";");
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 250);
    }, 2200);
  });
}
