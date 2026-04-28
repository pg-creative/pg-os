"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./chest.module.css";

interface CoinBalanceProps {
  coins: number;
}

/**
 * Pill that shows current coin count. When `coins` increases, briefly shows
 * a +N float-up over the pill. Calm — no fireworks.
 */
export function CoinBalance({ coins }: CoinBalanceProps) {
  const prev = useRef<number>(coins);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    if (coins > prev.current) {
      const d = coins - prev.current;
      setDelta(d);
      const t = window.setTimeout(() => setDelta(null), 1400);
      prev.current = coins;
      return () => window.clearTimeout(t);
    }
    prev.current = coins;
  }, [coins]);

  return (
    <span
      className={styles.balance}
      aria-label={`${coins} coins`}
      aria-live="polite"
    >
      <span className={styles.balanceCoin} aria-hidden="true" />
      {coins.toLocaleString()}
      {delta != null && delta > 0 && (
        <span className={styles.balanceDelta} aria-hidden="true">+{delta}</span>
      )}
    </span>
  );
}
