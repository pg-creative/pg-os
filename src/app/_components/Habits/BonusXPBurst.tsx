"use client";
import { useEffect, useState } from "react";

export interface XPBurst {
  id: number;
  xp: number;
  bonus: boolean;
}

/**
 * Floating "+XP" number that rises and fades. Renders absolutely-positioned
 * inside its anchor (parent must be position: relative). Auto-removes after
 * the CSS animation completes (~800ms). Bonus bursts (>1.0× multiplier) are
 * golden.
 */
export function BonusXPBurst({ burst, onDone }: { burst: XPBurst; onDone: (id: number) => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone(burst.id);
    }, 850);
    return () => clearTimeout(t);
  }, [burst.id, onDone]);

  if (!visible) return null;
  return (
    <span
      className={`ht-xp-burst${burst.bonus ? " bonus" : ""}`}
      aria-hidden="true"
    >
      +{burst.xp} XP
    </span>
  );
}
