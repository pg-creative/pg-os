"use client";
import { useCallback, useEffect, useState } from "react";

type WhoopData = {
  authed: boolean;
  recovery?: number | null;
  hrv?: number | null;
  restingHr?: number | null;
  sleepHours?: number | null;
  sleepPerformance?: number | null;
};

function tier(score: number): { label: string; cls: string } {
  if (score >= 67) return { label: "GREEN", cls: "bridge-recovery-green" };
  if (score >= 34) return { label: "YELLOW", cls: "bridge-recovery-yellow" };
  return { label: "RED", cls: "bridge-recovery-red" };
}

export function RecoveryWidget() {
  const [data, setData] = useState<WhoopData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/vitals/whoop", { cache: "no-store" });
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 5 * 60_000);
    return () => clearInterval(i);
  }, [fetchData]);

  if (!data) {
    return (
      <div className="bridge-widget">
        <div className="bridge-widget-label">RECOVERY</div>
        <div className="bridge-widget-body bridge-widget-skel">syncing…</div>
      </div>
    );
  }

  if (!data.authed) {
    return (
      <div className="bridge-widget">
        <div className="bridge-widget-label">RECOVERY</div>
        <div className="bridge-widget-body bridge-widget-empty">
          <a href="/api/auth/whoop" className="bridge-widget-link">
            Connect Whoop →
          </a>
        </div>
      </div>
    );
  }

  const score = data.recovery;
  if (score === null || score === undefined) {
    return (
      <div className="bridge-widget">
        <div className="bridge-widget-label">RECOVERY</div>
        <div className="bridge-widget-body bridge-widget-empty">no reading yet</div>
      </div>
    );
  }

  const t = tier(score);

  return (
    <div className={`bridge-widget bridge-widget-recovery ${t.cls}`}>
      <div className="bridge-widget-label">
        RECOVERY
        <span className="bridge-widget-tag bridge-recovery-tier">{t.label}</span>
      </div>
      <div className="bridge-widget-body">
        <div className="bridge-recovery-score">
          <span className="bridge-recovery-num">{score}</span>
          <span className="bridge-recovery-pct">%</span>
        </div>
        <div className="bridge-recovery-meta">
          {data.hrv !== null && data.hrv !== undefined && (
            <span>HRV {Math.round(data.hrv)}</span>
          )}
          {data.restingHr !== null && data.restingHr !== undefined && (
            <span>RHR {Math.round(data.restingHr)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
