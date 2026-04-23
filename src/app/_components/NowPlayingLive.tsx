"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NowPlayingResponse } from "@/app/api/spotify/now-playing/route";
import { Waveform } from "./Waveform";

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function NowPlayingLive() {
  const [data, setData] = useState<NowPlayingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localProgressMs, setLocalProgressMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const anchorRef = useRef<{ startedAt: number; progressAtStart: number } | null>(null);

  const fetchNP = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/now-playing", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: NowPlayingResponse = await res.json();
      setData(json);
      setError(null);
      if (json.authed && json.playing && json.track) {
        anchorRef.current = { startedAt: Date.now(), progressAtStart: json.track.progressMs };
        setLocalProgressMs(json.track.progressMs);
      } else {
        anchorRef.current = null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed");
    }
  }, []);

  useEffect(() => { fetchNP(); }, [fetchNP]);

  // Tick local progress every 500ms between API polls
  useEffect(() => {
    if (!data || !("playing" in data) || !data.playing || !data.track) return;
    const durationMs = data.track.durationMs;
    const tick = setInterval(() => {
      if (!anchorRef.current) return;
      const elapsed = Date.now() - anchorRef.current.startedAt;
      const next = anchorRef.current.progressAtStart + elapsed;
      setLocalProgressMs(Math.min(next, durationMs));
      if (next >= durationMs) fetchNP(); // track finished — re-fetch
    }, 500);
    return () => clearInterval(tick);
  }, [data, fetchNP]);

  // Re-poll from Spotify every 10s while playing, 60s when idle — catches external changes (someone skips on phone)
  useEffect(() => {
    const isPlaying = !!(data && "playing" in data && data.playing);
    const intervalMs = isPlaying ? 10_000 : 60_000;
    const i = setInterval(fetchNP, intervalMs);
    return () => clearInterval(i);
  }, [data, fetchNP]);

  async function command(action: "play" | "pause" | "next" | "previous") {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/spotify/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(`${action}: ${j.error ?? res.status}${j.detail ? ` — ${j.detail}` : ""}`);
      } else {
        setTimeout(fetchNP, 400); // Spotify takes a moment to propagate state
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "command failed");
    } finally {
      setBusy(false);
    }
  }

  // ── Loading
  if (!data && !error) {
    return (
      <>
        <div className="np-body">
          <div className="np-art" />
          <div className="np-info"><div className="title">Loading…</div><div className="sub">&nbsp;</div></div>
        </div>
        <Waveform />
        <div className="np-controls">
          <span>0:00</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="btn">‹</div>
            <div className="btn play">▶</div>
            <div className="btn">›</div>
          </div>
          <span>0:00</span>
        </div>
      </>
    );
  }

  // ── Not authed
  if (data && !data.authed) {
    return (
      <>
        <div className="np-body">
          <div className="np-art" />
          <div className="np-info"><div className="title">Spotify</div><div className="sub">NOT CONNECTED</div></div>
        </div>
        <div className="cal-signin" style={{ marginTop: 12 }}>
          <span>Connect Spotify</span>
          <a href="/api/auth/spotify">Sign in →</a>
        </div>
      </>
    );
  }

  // ── Authed, not playing — still allow play button to resume
  if (data && data.authed && !data.playing) {
    return (
      <>
        <div className="np-body">
          <div className="np-art" />
          <div className="np-info"><div className="title">Nothing <em>playing</em></div><div className="sub">SPOTIFY · IDLE</div></div>
        </div>
        <Waveform />
        <div className="np-controls">
          <span>—</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn" onClick={() => command("previous")} disabled={busy} aria-label="Previous">‹</button>
            <button className="btn play" onClick={() => command("play")} disabled={busy} aria-label="Play">▶</button>
            <button className="btn" onClick={() => command("next")} disabled={busy} aria-label="Next">›</button>
          </div>
          <span>—</span>
        </div>
        {error && <div className="vit-sub" style={{ color: "var(--danger)", marginTop: 8 }}>{error}</div>}
      </>
    );
  }

  // ── Playing
  if (data && data.authed && data.playing && data.track) {
    const t = data.track;
    const parts = t.name.split(" ");
    const lastWord = parts.pop() ?? "";
    const firstPart = parts.join(" ");
    const artStyle = t.albumArt
      ? { backgroundImage: `url(${t.albumArt})`, backgroundSize: "cover", backgroundPosition: "center" }
      : {};
    const progress = Math.min(localProgressMs, t.durationMs);
    return (
      <>
        <div className="np-body">
          <div className="np-art np-art-img" style={artStyle} />
          <div className="np-info">
            <a href={t.externalUrl} target="_blank" rel="noopener noreferrer" className="np-title-link">
              <div className="title">{firstPart ? firstPart + " " : ""}<em>{lastWord}</em></div>
            </a>
            <div className="sub">{t.artists.toUpperCase()} · {t.album.toUpperCase()}</div>
          </div>
        </div>
        <Waveform progress={progress / Math.max(t.durationMs, 1)} />
        <div className="np-controls">
          <span>{fmtTime(progress)}</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn" onClick={() => command("previous")} disabled={busy} aria-label="Previous">‹</button>
            <button className="btn play" onClick={() => command("pause")} disabled={busy} aria-label="Pause">❚❚</button>
            <button className="btn" onClick={() => command("next")} disabled={busy} aria-label="Next">›</button>
          </div>
          <span>{fmtTime(t.durationMs)}</span>
        </div>
        {error && <div className="vit-sub" style={{ color: "var(--danger)", marginTop: 8 }}>{error}</div>}
      </>
    );
  }

  // ── Error
  return (
    <div className="np-body">
      <div className="np-info"><div className="title">Spotify error</div><div className="sub">{error ?? "unknown"}</div></div>
    </div>
  );
}
