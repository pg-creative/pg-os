"use client";
import { useEffect, useState } from "react";

const BIRTH_ISO = "1996-10-02";
const LIFE_EXPECTANCY_YEARS = 80; // 80 × 52 = 4160 weeks. Adjust if PG wants.
const TOTAL_WEEKS = LIFE_EXPECTANCY_YEARS * 52;

function weeksLived(): number {
  const ms = Date.now() - new Date(BIRTH_ISO).getTime();
  return Math.floor(ms / (7 * 86_400_000));
}

export function MementoMori() {
  const [lived, setLived] = useState<number | null>(null);

  useEffect(() => {
    setLived(weeksLived());
    const i = setInterval(() => setLived(weeksLived()), 60 * 60_000);
    return () => clearInterval(i);
  }, []);

  if (lived === null) {
    return (
      <div className="bridge-widget">
        <div className="bridge-widget-label">MEMENTO</div>
        <div className="bridge-widget-body bridge-widget-skel">…</div>
      </div>
    );
  }

  const remaining = TOTAL_WEEKS - lived;
  const pct = Math.round((lived / TOTAL_WEEKS) * 1000) / 10;

  return (
    <div className="bridge-widget bridge-widget-memento">
      <div className="bridge-widget-label">
        MEMENTO
        <span className="bridge-widget-tag">{pct}% spent</span>
      </div>
      <div className="bridge-widget-body">
        <div className="bridge-memento-num">{remaining.toLocaleString()}</div>
        <div className="bridge-memento-label">weeks remaining</div>
      </div>
    </div>
  );
}
