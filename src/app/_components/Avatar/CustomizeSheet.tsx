"use client";

import { useEffect } from "react";
import styles from "./avatar.module.css";
import type { AvatarState, Cosmetic, CosmeticSlot } from "@/lib/avatar";

interface CustomizeSheetProps {
  state: AvatarState;
  catalog: Cosmetic[];
  onClose: () => void;
  onEquip: (slot: CosmeticSlot, key: string | null) => Promise<void>;
}

/**
 * Bottom-sheet customizer. Shows ALL cosmetics, grouped by slot. Owned
 * items are tappable. Locked items are dimmed with "earn from a chest" hint.
 */
export function CustomizeSheet({ state, catalog, onClose, onEquip }: CustomizeSheetProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const slots: CosmeticSlot[] = ["palette", "aura", "hat", "companion"];

  function isOwned(slot: CosmeticSlot, key: string): boolean {
    return (state.owned?.[slot] ?? []).includes(key);
  }

  function isEquipped(slot: CosmeticSlot, key: string): boolean {
    if (slot === "palette") return state.palette === key;
    if (slot === "aura") return state.aura === key;
    if (slot === "hat") return state.hat === key;
    if (slot === "companion") return state.companion === key;
    return false;
  }

  function slotLabel(slot: CosmeticSlot): string {
    return slot.charAt(0).toUpperCase() + slot.slice(1);
  }

  return (
    <div
      className={styles.sheetBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Customize soul-being"
      onClick={onClose}
    >
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.sheetTitle}>Customize your soul-being</h2>
        <p className={styles.sheetSubtitle}>Earn cosmetics from chests, then slot them here.</p>

        {slots.map((slot) => {
          const items = catalog.filter((c) => c.slot === slot);
          return (
            <div key={slot} className={styles.slotSection}>
              <p className={styles.slotLabel}>{slotLabel(slot)}</p>
              <div className={styles.slotGrid}>
                {/* Allow unequip for hats / companions only */}
                {(slot === "hat" || slot === "companion") && (
                  <button
                    key="none"
                    type="button"
                    className={styles.slotItem}
                    data-equipped={isEquipped(slot, "") || (slot === "hat" ? !state.hat : !state.companion)}
                    onClick={() => onEquip(slot, null)}
                  >
                    <span className={styles.slotItemName}>None</span>
                    <span style={{ fontSize: 11, opacity: 0.7 }}>Unequip</span>
                  </button>
                )}
                {items.map((c) => {
                  const owned = isOwned(slot, c.key);
                  const equipped = isEquipped(slot, c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      className={styles.slotItem}
                      data-equipped={equipped}
                      data-locked={!owned}
                      disabled={!owned}
                      onClick={() => owned && onEquip(slot, c.key)}
                      aria-label={`${c.label}${owned ? "" : " (locked)"}`}
                    >
                      <span className={styles.slotItemName}>{c.label}</span>
                      <span style={{ fontSize: 11, opacity: 0.7 }}>{c.flavour}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <button type="button" className={styles.closeBtn} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
