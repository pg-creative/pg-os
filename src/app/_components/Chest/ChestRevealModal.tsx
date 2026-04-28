"use client";

import { useEffect } from "react";
import styles from "./chest.module.css";
import type { ChestPullResult } from "@/lib/chests";

interface ChestRevealModalProps {
  pull: ChestPullResult;
  onClose: () => void;
}

/**
 * Genshin-style CALM reveal — NOT a slot-machine surprise.
 * The chest is shown with its rarity tag visible from the start (Monster
 * Hunter convention). Lid lifts on a 1.1s ease, warm amber glow swells from
 * inside, reward fades into view BELOW the chest. No confetti, no particles.
 */
export function ChestRevealModal({ pull, onClose }: ChestRevealModalProps) {
  // Esc to dismiss
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chest-reveal-title"
      onClick={onClose}
    >
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={`${styles.rarityTag} ${styles[pull.reward.rarity]}`}>
          {pull.reward.rarity}
        </span>

        <div className={`${styles.modalChest} ${styles[pull.chestType]} ${styles.modalChestTilt}`}>
          <div className={styles.modalChestGlow} aria-hidden="true" />
          <div className={styles.modalChestBody}>
            <div className={styles.modalChestLid} aria-hidden="true" />
          </div>
        </div>

        <div id="chest-reveal-title" className={styles.rewardLabel}>
          {pull.reward.label}
        </div>

        {pull.reward.flavour && (
          <div className={styles.rewardFlavour}>{pull.reward.flavour}</div>
        )}

        <button
          type="button"
          className={styles.dismiss}
          onClick={onClose}
          autoFocus
        >
          Take it
        </button>
      </div>
    </div>
  );
}
