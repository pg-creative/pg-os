"use client";

import { useState } from "react";
import styles from "./chest.module.css";
import type { Chest, ChestType } from "@/lib/chests";

interface ChestCardProps {
  chest: Chest;
  /** Current coin balance — used to disable when too few. */
  coins: number;
  /** Has this chest been unlocked yet (tier-gated)? */
  unlocked: boolean;
  /** Are we already over the daily cap? */
  capReached: boolean;
  onPull: (chestType: ChestType) => void;
  /** Pull is in flight — disables the button. */
  busy?: boolean;
}

/**
 * Single chest tile. Mobile-first 160-200px wide. Tap to pull (with confirm).
 * The visual material is what signals rarity, NOT animation surprise — wood,
 * silver, gold, crystal each have a distinct CSS color set on the card.
 */
export function ChestCard({ chest, coins, unlocked, capReached, onPull, busy }: ChestCardProps) {
  const [confirming, setConfirming] = useState(false);
  const cant = !unlocked || capReached || coins < chest.costCoins || busy;

  const handleClick = () => {
    if (cant) return;
    if (!confirming) {
      setConfirming(true);
      // Auto-cancel confirmation after 4s
      window.setTimeout(() => setConfirming(false), 4000);
      return;
    }
    setConfirming(false);
    onPull(chest.type);
  };

  const reason = !unlocked
    ? `Locked — reach ${chest.unlockTier} tier`
    : capReached
    ? "Daily cap reached"
    : coins < chest.costCoins
    ? `Need ${chest.costCoins - coins} more coins`
    : null;

  return (
    <button
      type="button"
      className={`${styles.card} ${styles[chest.type]}`}
      onClick={handleClick}
      disabled={!!cant}
      aria-label={`${chest.name} — ${chest.costCoins} coins. ${reason ?? "Tap to pull"}`}
    >
      <div className={styles.glow} aria-hidden="true" />
      {!unlocked && <span className={styles.lockedBadge}>Locked</span>}

      <div className={styles.illo} aria-hidden="true">
        <div className={styles.body}>
          <span className={styles.bandH} />
          <span className={`${styles.band} ${styles.bandV}`} style={{ left: "20%" }} />
          <span className={`${styles.band} ${styles.bandV}`} style={{ left: "80%" }} />
          <span className={styles.lid} />
          <span className={styles.lock} />
        </div>
      </div>

      <div className={styles.title}>{chest.name}</div>
      <div className={styles.cost}>
        <span className={styles.coin} aria-hidden="true" />
        {chest.costCoins.toLocaleString()}
      </div>
      <div className={styles.desc}>
        {confirming ? "Tap again to pull" : reason ?? chest.description}
      </div>
    </button>
  );
}
