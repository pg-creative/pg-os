"use client";

// ─── Arm A — "Dead Reckoning" as conceived (cold precision instrument) ────────
// Palette: base #0a0b0d · panel #111318 · rules #1e2028 · amber #e8a030
//          go-green #6adc8a · muted #3a3e48 · alert #e05c3a

export default function ReckoningA() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@300;400;500;600&display=swap');

        .ra-root {
          --bg:        #0a0b0d;
          --panel:     #111318;
          --rule:      #1e2028;
          --amber:     #e8a030;
          --green:     #6adc8a;
          --muted:     #3a3e48;
          --alert:     #e05c3a;
          --text:      #c8cdd8;
          --text-dim:  #5a5f6e;
          --pip:       #e8a030;
          background: var(--bg);
          color: var(--text);
          font-family: 'Geist', system-ui, sans-serif;
          font-size: 13px;
          line-height: 1.4;
          width: 100%;
          min-height: 640px;
          max-width: 1180px;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
        }

        /* Scanline overlay */
        .ra-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.06) 2px,
            rgba(0,0,0,0.06) 4px
          );
          pointer-events: none;
          z-index: 100;
          opacity: 0.03;
        }

        .ra-layout {
          display: flex;
          width: 100%;
          height: 100%;
          min-height: 640px;
        }

        /* ── NAV RAIL ── */
        .ra-nav {
          width: 56px;
          background: var(--panel);
          border-right: 1px solid var(--rule);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 0;
          gap: 4px;
          flex-shrink: 0;
        }

        .ra-wordmark {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--amber);
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          margin-bottom: 16px;
          opacity: 0.9;
        }

        .ra-nav-item {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: background 0.15s;
          color: var(--text-dim);
        }

        .ra-nav-item.active {
          background: rgba(232, 160, 48, 0.12);
          color: var(--amber);
        }

        .ra-nav-item.active::before {
          content: '';
          position: absolute;
          left: -1px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: var(--amber);
          border-radius: 0 2px 2px 0;
        }

        .ra-nav-item:hover:not(.active) {
          background: rgba(255,255,255,0.04);
          color: var(--text);
        }

        .ra-nav-icon {
          font-family: 'Geist Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0;
        }

        /* ── MAIN CANVAS ── */
        .ra-canvas {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── INSTRUMENT CLUSTERS ── */
        .ra-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: auto 1fr auto;
          gap: 1px;
          background: var(--rule);
          border-bottom: 1px solid var(--rule);
        }

        .ra-cluster {
          background: var(--panel);
          padding: 18px 20px;
          position: relative;
        }

        .ra-cluster-hero {
          grid-column: 1 / 3;
          grid-row: 1;
          padding: 24px 28px;
        }

        .ra-cluster-kitsu {
          grid-column: 3;
          grid-row: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
          gap: 12px;
        }

        .ra-cluster-gauges {
          grid-column: 1 / 3;
          grid-row: 2;
        }

        .ra-cluster-activity {
          grid-column: 3;
          grid-row: 2;
        }

        /* ── FIELD LABELS ── */
        .ra-label {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 3px;
          display: block;
        }

        .ra-eyebrow {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--amber);
          opacity: 0.8;
          margin-bottom: 10px;
          display: block;
        }

        .ra-h1 {
          font-family: 'Geist', sans-serif;
          font-size: 22px;
          font-weight: 500;
          line-height: 1.2;
          color: #e0e4f0;
          margin: 0 0 8px;
          letter-spacing: -0.01em;
        }

        .ra-subhead {
          font-family: 'Geist', sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: var(--text-dim);
          max-width: 520px;
          font-weight: 300;
        }

        /* ── INSTRUMENT VALUE ── */
        .ra-reading {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: 4px;
        }

        .ra-val {
          font-family: 'Geist Mono', monospace;
          font-size: 28px;
          font-weight: 600;
          color: var(--amber);
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .ra-delta {
          font-family: 'Geist Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          color: var(--green);
          letter-spacing: 0.05em;
        }

        .ra-delta.neg { color: var(--alert); }

        /* ── GAUGE CARD ── */
        .ra-gauge {
          padding: 16px 18px;
          border: 1px solid var(--rule);
          border-radius: 4px;
          margin-bottom: 10px;
          position: relative;
          background: var(--bg);
        }

        .ra-gauge:last-child { margin-bottom: 0; }

        .ra-gauge-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .ra-gauge-name {
          font-family: 'Geist Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: 0.03em;
        }

        .ra-gauge-branch {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 0.05em;
        }

        .ra-status-badge {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 2px;
          background: rgba(106, 220, 138, 0.1);
          color: var(--green);
          border: 1px solid rgba(106, 220, 138, 0.25);
        }

        .ra-status-badge.blocked {
          background: rgba(224, 92, 58, 0.12);
          color: var(--alert);
          border-color: rgba(224, 92, 58, 0.3);
        }

        .ra-gauge-row {
          display: flex;
          gap: 24px;
          align-items: center;
        }

        .ra-gauge-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .ra-stat-val {
          font-family: 'Geist Mono', monospace;
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }

        .ra-stat-val.amber { color: var(--amber); }
        .ra-stat-val.alert { color: var(--alert); }
        .ra-stat-val.green { color: var(--green); }

        .ra-ctx-bar-wrap {
          flex: 1;
          height: 4px;
          background: var(--rule);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 18px;
        }

        .ra-ctx-bar {
          height: 100%;
          background: var(--amber);
          opacity: 0.7;
          border-radius: 2px;
          transition: width 0.4s cubic-bezier(0.2, 0, 0, 1);
        }

        .ra-ctx-bar.alert { background: var(--alert); }

        .ra-tool-tag {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          color: var(--text-dim);
          background: var(--rule);
          padding: 2px 7px;
          border-radius: 2px;
          letter-spacing: 0.08em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
          display: inline-block;
        }

        /* ── ACTIVITY ── */
        .ra-activity-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 10px 0;
          border-bottom: 1px solid var(--rule);
        }

        .ra-activity-row:last-child {
          border-bottom: none;
        }

        .ra-act-time {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          color: var(--text-dim);
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
          padding-top: 1px;
          letter-spacing: 0.05em;
        }

        .ra-act-msg {
          font-family: 'Geist', sans-serif;
          font-size: 12px;
          color: var(--text);
          flex: 1;
          line-height: 1.4;
        }

        .ra-act-diff {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          color: var(--green);
          flex-shrink: 0;
          letter-spacing: 0.04em;
        }

        /* ── KITSU POD ── */
        .ra-kitsu-pod {
          width: 80px;
          height: 80px;
          border-radius: 14px;
          border: 2px solid var(--rule);
          overflow: hidden;
          position: relative;
          background: var(--bg);
          box-shadow: inset 0 0 0 1px rgba(232, 160, 48, 0.08);
        }

        .ra-kitsu-ring {
          position: absolute;
          inset: -4px;
          border-radius: 18px;
          border: 2px solid transparent;
          background: linear-gradient(var(--panel), var(--panel)) padding-box,
                      linear-gradient(135deg, rgba(232,160,48,0.6), rgba(232,160,48,0)) border-box;
          animation: ra-ring-pulse 3s ease-in-out infinite;
        }

        @keyframes ra-ring-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .ra-kitsu-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }

        .ra-kitsu-label {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--amber);
          text-align: center;
        }

        .ra-kitsu-status {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          color: var(--text-dim);
          letter-spacing: 0.1em;
          text-align: center;
        }

        /* ── CTA ── */
        .ra-cta {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--amber);
          background: rgba(232, 160, 48, 0.08);
          border: 1px solid rgba(232, 160, 48, 0.3);
          padding: 8px 18px;
          border-radius: 3px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          transition: background 0.15s, border-color 0.15s;
        }

        .ra-cta:hover {
          background: rgba(232, 160, 48, 0.15);
          border-color: rgba(232, 160, 48, 0.5);
        }

        /* ── STATUS STRIP ── */
        .ra-strip {
          height: 32px;
          background: var(--panel);
          border-top: 1px solid var(--rule);
          display: flex;
          align-items: center;
          padding: 0 20px;
          gap: 28px;
          flex-shrink: 0;
        }

        .ra-strip-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ra-strip-key {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-dim);
        }

        .ra-strip-val {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          font-weight: 500;
          color: var(--text);
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.04em;
        }

        .ra-strip-val.ok { color: var(--green); }
        .ra-strip-val.warn { color: var(--amber); }

        .ra-strip-sep {
          width: 1px;
          height: 14px;
          background: var(--rule);
        }

        /* ── STREAK ── */
        .ra-streak {
          display: flex;
          gap: 5px;
          align-items: center;
          margin-top: 10px;
        }

        .ra-glyph {
          font-size: 11px;
          color: var(--amber);
        }

        .ra-glyph.empty { color: var(--muted); }
      `}</style>

      <div className="ra-root">
        <div className="ra-layout">
          {/* ── NAV RAIL ── */}
          <nav className="ra-nav">
            <span className="ra-wordmark">PG OS</span>
            {[
              { key: "H", label: "Home", active: true },
              { key: "Hb", label: "Habits", active: false },
              { key: "Pj", label: "Projects", active: false },
              { key: "Fl", label: "Flow", active: false },
              { key: "Cl", label: "Claude", active: false },
            ].map((item) => (
              <div
                key={item.key}
                className={`ra-nav-item${item.active ? " active" : ""}`}
                title={item.label}
              >
                <span className="ra-nav-icon">{item.key}</span>
              </div>
            ))}
          </nav>

          {/* ── MAIN CANVAS ── */}
          <div className="ra-canvas">
            <div className="ra-grid">
              {/* ── HERO CLUSTER ── */}
              <div className="ra-cluster ra-cluster-hero">
                <span className="ra-eyebrow">
                  Late Night · Kitsu Is Watching The Fleet
                </span>
                <h1 className="ra-h1">
                  Three sessions live,
                  <br />
                  one waiting on your call.
                </h1>
                <p className="ra-subhead">
                  Three sessions live, one waiting on your call. The night is
                  quiet — a good time to ship the thing you keep circling.
                </p>
                <div className="ra-streak">
                  <span className="ra-label" style={{ marginBottom: 0 }}>
                    Streak
                  </span>
                  {["●", "●", "●", "○"].map((g, i) => (
                    <span
                      key={i}
                      className={`ra-glyph${g === "○" ? " empty" : ""}`}
                    >
                      {g}
                    </span>
                  ))}
                </div>
                <button className="ra-cta">+ New Session →</button>
              </div>

              {/* ── KITSU POD ── */}
              <div className="ra-cluster ra-cluster-kitsu">
                <div style={{ position: "relative", display: "inline-block" }}>
                  <div className="ra-kitsu-ring" />
                  <div className="ra-kitsu-pod">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/agent-office/pixel/marvis-kitsune.png"
                      alt="Kitsu"
                      className="ra-kitsu-img"
                    />
                  </div>
                </div>
                <span className="ra-kitsu-label">Kitsu</span>
                <span className="ra-kitsu-status">● Idle</span>
              </div>

              {/* ── GAUGE CLUSTER ── */}
              <div
                className="ra-cluster ra-cluster-gauges"
                style={{ padding: "16px 20px" }}
              >
                <span
                  className="ra-label"
                  style={{ marginBottom: "12px", display: "block" }}
                >
                  Project Gauges
                </span>

                {/* Gauge 1 — personal-os */}
                <div className="ra-gauge">
                  <div className="ra-gauge-header">
                    <div>
                      <div className="ra-gauge-name">personal-os</div>
                      <div className="ra-gauge-branch">cockpit · 2d</div>
                    </div>
                    <span className="ra-status-badge">Active</span>
                  </div>
                  <div className="ra-gauge-row">
                    <div className="ra-gauge-stat">
                      <span className="ra-label">CTX</span>
                      <span className="ra-stat-val amber">48%</span>
                    </div>
                    <div className="ra-gauge-stat">
                      <span className="ra-label">Tool</span>
                      <span className="ra-tool-tag">
                        mcp_claude-in-chrome__browser_batch
                      </span>
                    </div>
                    <div className="ra-ctx-bar-wrap">
                      <div className="ra-ctx-bar" style={{ width: "48%" }} />
                    </div>
                  </div>
                </div>

                {/* Gauge 2 — metrasens */}
                <div className="ra-gauge">
                  <div className="ra-gauge-header">
                    <div>
                      <div className="ra-gauge-name">metrasens</div>
                      <div className="ra-gauge-branch">signal-hub · 4d</div>
                    </div>
                    <span className="ra-status-badge blocked">Blocked</span>
                  </div>
                  <div className="ra-gauge-row">
                    <div className="ra-gauge-stat">
                      <span className="ra-label">Issue</span>
                      <span
                        className="ra-stat-val alert"
                        style={{
                          fontSize: "12px",
                          fontFamily: "Geist Mono, monospace",
                          letterSpacing: "0.04em",
                        }}
                      >
                        MRE bucket
                      </span>
                    </div>
                    <div className="ra-gauge-stat">
                      <span className="ra-label">Decision</span>
                      <span className="ra-tool-tag">UPGRADE or CURRENT?</span>
                    </div>
                    <div className="ra-ctx-bar-wrap">
                      <div
                        className="ra-ctx-bar alert"
                        style={{ width: "72%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ACTIVITY CLUSTER ── */}
              <div className="ra-cluster ra-cluster-activity">
                <span
                  className="ra-label"
                  style={{ marginBottom: "8px", display: "block" }}
                >
                  Recent Activity
                </span>

                {[
                  {
                    time: "09:58",
                    msg: "legibility foundation shipped",
                    diff: "+711 −0",
                  },
                  {
                    time: "09:24",
                    msg: "party mode — Kitsu sings first",
                    diff: "+180 −44",
                  },
                  { time: "08:51", msg: "fox head reframed", diff: "+12 −9" },
                ].map((row) => (
                  <div key={row.time} className="ra-activity-row">
                    <span className="ra-act-time">{row.time}</span>
                    <span className="ra-act-msg">{row.msg}</span>
                    <span className="ra-act-diff">{row.diff}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── STATUS STRIP ── */}
            <div className="ra-strip">
              <div className="ra-strip-item">
                <span className="ra-strip-key">Time</span>
                <span className="ra-strip-val">23:14</span>
              </div>
              <div className="ra-strip-sep" />
              <div className="ra-strip-item">
                <span className="ra-strip-key">CTX</span>
                <span className="ra-strip-val warn">48%</span>
              </div>
              <div className="ra-strip-sep" />
              <div className="ra-strip-item">
                <span className="ra-strip-key">Build</span>
                <span className="ra-strip-val ok">✓ Healthy</span>
              </div>
              <div className="ra-strip-sep" />
              <div className="ra-strip-item">
                <span className="ra-strip-key">Sessions</span>
                <span className="ra-strip-val">3 live</span>
              </div>
              <div className="ra-strip-sep" />
              <div className="ra-strip-item">
                <span className="ra-strip-key">Commits</span>
                <span className="ra-strip-val">
                  4 <span style={{ color: "var(--green)" }}>+2</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
