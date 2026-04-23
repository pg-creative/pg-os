"use client";
import { useEffect, useState } from "react";
import type { VitalsResponse } from "@/app/api/vitals/whoop/route";

function Ring({ color, pct, label, value }: { color: string; pct: number; label: string; value: string }) {
  const dash = Math.max(0, Math.min(113, (pct / 100) * 113));
  return (
    <div className="ring">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border-soft)" strokeWidth="3" />
        <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${dash} 113`} transform="rotate(-90 22 22)" />
      </svg>
      <span className="num">{value}</span>
      {label}
    </div>
  );
}

export function VitalsLive() {
  const [data, setData] = useState<VitalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchVitals() {
    try {
      const res = await fetch("/api/vitals/whoop", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed");
    }
  }

  useEffect(() => {
    fetchVitals();
    const i = setInterval(fetchVitals, 5 * 60_000);
    return () => clearInterval(i);
  }, []);

  const bigValue = data && data.authed && data.recovery != null ? `${data.recovery}%` : "—";
  const bigLabel = "RECOVERY";
  const subLine = data && data.authed && data.recovery != null
    ? `WHOOP · LIVE · ${data.sleepHours != null ? data.sleepHours + "hrs SLEEP" : "—"}`
    : "WHOOP DATA";

  return (
    <>
      <div className="vit-hero">
        <div className="vit-big">{bigValue} <small>{bigLabel}</small></div>
        <div className="vit-sub">{subLine}</div>
      </div>

      {data && !data.authed && (
        <div className="cal-signin" style={{ marginTop: 4, marginBottom: 14 }}>
          <span>Connect Whoop</span>
          <a href="/api/auth/whoop">Sign in →</a>
        </div>
      )}

      {data && data.authed && (
        <>
          <div className="vit-grid" style={{ marginTop: 14 }}>
            <div className="vit-kv">
              <div className="k">HEART</div>
              <div className="v">{data.restingHr ?? "—"} <small>bpm</small></div>
            </div>
            <div className="vit-kv">
              <div className="k">SLEEP</div>
              <div className="v">{data.sleepHours ?? "—"} <small>hrs</small></div>
            </div>
            <div className="vit-kv">
              <div className="k">HRV</div>
              <div className="v">{data.hrv != null ? Math.round(data.hrv) : "—"} <small>ms</small></div>
            </div>
            <div className="vit-kv">
              <div className="k">SLEEP PERF</div>
              <div className="v">{data.sleepPerformance ?? "—"} <small>%</small></div>
            </div>
          </div>
          <div className="rings">
            <Ring color="var(--accent-2)" pct={data.recovery ?? 0} label="RECOVERY" value={data.recovery != null ? `${data.recovery}%` : "—"} />
            <Ring color="var(--success)" pct={data.sleepPerformance ?? 0} label="SLEEP" value={data.sleepPerformance != null ? `${data.sleepPerformance}%` : "—"} />
            <Ring color="var(--accent-3)" pct={data.hrv ? Math.min(100, (data.hrv / 120) * 100) : 0} label="HRV" value={data.hrv != null ? String(Math.round(data.hrv)) : "—"} />
          </div>
        </>
      )}

      {error && <div className="vit-sub" style={{ color: "var(--danger)" }}>Error: {error}</div>}
    </>
  );
}
