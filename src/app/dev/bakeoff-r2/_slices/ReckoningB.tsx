"use client";

// ─── Arm B — "Golden Hour" (warm vacuum-tube / brass instrument) ──────────────
// Same Dead Reckoning structure as A. Skin: warm near-black bg with amber
// ambient glow, brass/gold engraved rules, jewel-emerald go-signal, soft
// warm-light wash. Like beautiful analog instrumentation at golden hour.

export default function ReckoningB() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@300;400;500;600&display=swap');

        .rb-root {
          --bg:        #0d0a06;
          --panel:     #16110a;
          --rule:      #2e2416;
          --amber:     #f0b840;
          --green:     #4ec98a;
          --muted:     #4a3e2c;
          --alert:     #e06040;
          --text:      #d4c4a0;
          --text-dim:  #6a5840;
          --glow:      rgba(240,160,40,0.06);
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

        /* Warm ambient glow wash */
        .rb-root::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 70% 50% at 35% 0%,
            rgba(240, 160, 40, 0.06) 0%,
            transparent 70%
          );
          pointer-events: none;
          z-index: 0;
        }

        /* Scanline */
        .rb-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.05) 2px,
            rgba(0,0,0,0.05) 4px
          );
          pointer-events: none;
          z-index: 101;
          opacity: 0.03;
        }

        .rb-layout {
          display: flex;
          width: 100%;
          height: 100%;
          min-height: 640px;
          position: relative;
          z-index: 1;
        }

        /* ── NAV RAIL ── */
        .rb-nav {
          width: 56px;
          background: var(--panel);
          border-right: 1px solid var(--rule);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 0;
          gap: 4px;
          flex-shrink: 0;
          box-shadow: inset -1px 0 0 rgba(240,160,40,0.06);
        }

        .rb-wordmark {
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
          text-shadow: 0 0 12px rgba(240,160,40,0.4);
        }

        .rb-nav-item {
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

        .rb-nav-item.active {
          background: rgba(240, 160, 40, 0.1);
          color: var(--amber);
          box-shadow: 0 0 12px rgba(240,160,40,0.15) inset;
        }

        .rb-nav-item.active::before {
          content: '';
          position: absolute;
          left: -1px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: linear-gradient(180deg, rgba(240,180,60,0.9), rgba(240,160,40,0.6));
          border-radius: 0 2px 2px 0;
          box-shadow: 0 0 8px rgba(240,160,40,0.5);
        }

        .rb-nav-item:hover:not(.active) {
          background: rgba(240,160,40,0.04);
          color: var(--text);
        }

        .rb-nav-icon {
          font-family: 'Geist Mono', monospace;
          font-size: 12px;
          font-weight: 600;
        }

        /* ── MAIN CANVAS ── */
        .rb-canvas {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .rb-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: auto 1fr auto;
          gap: 1px;
          background: var(--rule);
          border-bottom: 1px solid var(--rule);
        }

        .rb-cluster {
          background: var(--panel);
          padding: 18px 20px;
          position: relative;
        }

        /* Brass-edge highlight on panel tops */
        .rb-cluster::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(240,160,40,0.18), transparent);
        }

        .rb-cluster-hero {
          grid-column: 1 / 3;
          grid-row: 1;
          padding: 24px 28px;
          background: linear-gradient(135deg, #16110a 70%, #1c160d 100%);
        }

        .rb-cluster-kitsu {
          grid-column: 3;
          grid-row: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
          gap: 12px;
        }

        .rb-cluster-gauges {
          grid-column: 1 / 3;
          grid-row: 2;
        }

        .rb-cluster-activity {
          grid-column: 3;
          grid-row: 2;
        }

        .rb-label {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 3px;
          display: block;
        }

        .rb-eyebrow {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--amber);
          opacity: 0.85;
          margin-bottom: 10px;
          display: block;
          text-shadow: 0 0 16px rgba(240,160,40,0.3);
        }

        .rb-h1 {
          font-family: 'Geist', sans-serif;
          font-size: 22px;
          font-weight: 500;
          line-height: 1.2;
          color: #e8d8b0;
          margin: 0 0 8px;
          letter-spacing: -0.01em;
        }

        .rb-subhead {
          font-family: 'Geist', sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: var(--text-dim);
          max-width: 520px;
          font-weight: 300;
        }

        /* ── GAUGE ── */
        .rb-gauge {
          padding: 16px 18px;
          border: 1px solid var(--rule);
          border-radius: 4px;
          margin-bottom: 10px;
          background: #110d08;
          position: relative;
          box-shadow: inset 0 1px 0 rgba(240,160,40,0.06);
        }

        .rb-gauge:last-child { margin-bottom: 0; }

        .rb-gauge-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .rb-gauge-name {
          font-family: 'Geist Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: 0.03em;
        }

        .rb-gauge-branch {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 0.05em;
        }

        .rb-status-badge {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 2px;
          background: rgba(78, 201, 138, 0.1);
          color: var(--green);
          border: 1px solid rgba(78, 201, 138, 0.25);
          text-shadow: 0 0 8px rgba(78,201,138,0.3);
        }

        .rb-status-badge.blocked {
          background: rgba(224, 96, 64, 0.12);
          color: var(--alert);
          border-color: rgba(224, 96, 64, 0.3);
          text-shadow: 0 0 8px rgba(224,96,64,0.3);
        }

        .rb-gauge-row {
          display: flex;
          gap: 24px;
          align-items: center;
        }

        .rb-gauge-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .rb-stat-val {
          font-family: 'Geist Mono', monospace;
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }

        .rb-stat-val.amber {
          color: var(--amber);
          text-shadow: 0 0 12px rgba(240,160,40,0.35);
        }

        .rb-stat-val.alert { color: var(--alert); }

        .rb-ctx-bar-wrap {
          flex: 1;
          height: 4px;
          background: var(--rule);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 18px;
        }

        .rb-ctx-bar {
          height: 100%;
          background: linear-gradient(90deg, rgba(240,160,40,0.8), rgba(240,140,20,1));
          border-radius: 2px;
          box-shadow: 0 0 6px rgba(240,160,40,0.4);
          transition: width 0.4s cubic-bezier(0.2, 0, 0, 1);
        }

        .rb-ctx-bar.alert {
          background: linear-gradient(90deg, rgba(224,96,64,0.8), rgba(224,80,48,1));
          box-shadow: 0 0 6px rgba(224,80,48,0.4);
        }

        .rb-tool-tag {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          color: var(--text-dim);
          background: rgba(46,36,22,0.8);
          padding: 2px 7px;
          border-radius: 2px;
          letter-spacing: 0.08em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
          display: inline-block;
          border: 1px solid rgba(46,36,22,1);
        }

        /* ── ACTIVITY ── */
        .rb-activity-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 10px 0;
          border-bottom: 1px solid var(--rule);
        }

        .rb-activity-row:last-child { border-bottom: none; }

        .rb-act-time {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          color: var(--text-dim);
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
          padding-top: 1px;
          letter-spacing: 0.05em;
        }

        .rb-act-msg {
          font-family: 'Geist', sans-serif;
          font-size: 12px;
          color: var(--text);
          flex: 1;
          line-height: 1.4;
        }

        .rb-act-diff {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          color: var(--green);
          flex-shrink: 0;
          letter-spacing: 0.04em;
          text-shadow: 0 0 6px rgba(78,201,138,0.3);
        }

        /* ── KITSU POD ── */
        .rb-kitsu-pod {
          width: 80px;
          height: 80px;
          border-radius: 14px;
          border: 2px solid rgba(240,160,40,0.3);
          overflow: hidden;
          position: relative;
          background: var(--bg);
          box-shadow:
            inset 0 0 0 1px rgba(240,160,40,0.1),
            0 0 20px rgba(240,160,40,0.1);
        }

        .rb-kitsu-ring {
          position: absolute;
          inset: -4px;
          border-radius: 18px;
          border: 2px solid transparent;
          background: linear-gradient(var(--panel), var(--panel)) padding-box,
                      linear-gradient(135deg, rgba(240,180,60,0.8), rgba(240,140,20,0.2), transparent) border-box;
          animation: rb-ring-pulse 3s ease-in-out infinite;
        }

        @keyframes rb-ring-pulse {
          0%, 100% { opacity: 0.5; box-shadow: 0 0 8px rgba(240,160,40,0.15); }
          50% { opacity: 1; box-shadow: 0 0 16px rgba(240,160,40,0.3); }
        }

        .rb-kitsu-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }

        .rb-kitsu-label {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--amber);
          text-align: center;
          text-shadow: 0 0 10px rgba(240,160,40,0.4);
        }

        .rb-kitsu-status {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          color: var(--text-dim);
          letter-spacing: 0.1em;
          text-align: center;
        }

        /* ── CTA ── */
        .rb-cta {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--amber);
          background: rgba(240, 160, 40, 0.08);
          border: 1px solid rgba(240, 160, 40, 0.3);
          padding: 8px 18px;
          border-radius: 3px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
          box-shadow: 0 0 12px rgba(240,160,40,0.08);
        }

        .rb-cta:hover {
          background: rgba(240, 160, 40, 0.14);
          border-color: rgba(240, 160, 40, 0.5);
          box-shadow: 0 0 20px rgba(240,160,40,0.15);
        }

        .rb-streak {
          display: flex;
          gap: 5px;
          align-items: center;
          margin-top: 10px;
        }

        .rb-glyph {
          font-size: 11px;
          color: var(--amber);
          text-shadow: 0 0 8px rgba(240,160,40,0.4);
        }

        .rb-glyph.empty { color: var(--muted); text-shadow: none; }

        /* ── STATUS STRIP ── */
        .rb-strip {
          height: 32px;
          background: #120e08;
          border-top: 1px solid var(--rule);
          display: flex;
          align-items: center;
          padding: 0 20px;
          gap: 28px;
          flex-shrink: 0;
          box-shadow: inset 0 1px 0 rgba(240,160,40,0.05);
        }

        .rb-strip-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rb-strip-key {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-dim);
        }

        .rb-strip-val {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          font-weight: 500;
          color: var(--text);
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.04em;
        }

        .rb-strip-val.ok {
          color: var(--green);
          text-shadow: 0 0 6px rgba(78,201,138,0.3);
        }

        .rb-strip-val.warn {
          color: var(--amber);
          text-shadow: 0 0 6px rgba(240,160,40,0.3);
        }

        .rb-strip-sep {
          width: 1px;
          height: 14px;
          background: var(--rule);
        }
      `}</style>

      <div className="rb-root">
        <div className="rb-layout">
          {/* ── NAV RAIL ── */}
          <nav className="rb-nav">
            <span className="rb-wordmark">PG OS</span>
            {[
              { key: "H", label: "Home", active: true },
              { key: "Hb", label: "Habits", active: false },
              { key: "Pj", label: "Projects", active: false },
              { key: "Fl", label: "Flow", active: false },
              { key: "Cl", label: "Claude", active: false },
            ].map((item) => (
              <div
                key={item.key}
                className={`rb-nav-item${item.active ? " active" : ""}`}
                title={item.label}
              >
                <span className="rb-nav-icon">{item.key}</span>
              </div>
            ))}
          </nav>

          {/* ── MAIN CANVAS ── */}
          <div className="rb-canvas">
            <div className="rb-grid">
              {/* ── HERO CLUSTER ── */}
              <div className="rb-cluster rb-cluster-hero">
                <span className="rb-eyebrow">
                  Late Night · Kitsu Is Watching The Fleet
                </span>
                <h1 className="rb-h1">
                  Three sessions live,
                  <br />
                  one waiting on your call.
                </h1>
                <p className="rb-subhead">
                  Three sessions live, one waiting on your call. The night is
                  quiet — a good time to ship the thing you keep circling.
                </p>
                <div className="rb-streak">
                  <span className="rb-label" style={{ marginBottom: 0 }}>
                    Streak
                  </span>
                  {["●", "●", "●", "○"].map((g, i) => (
                    <span
                      key={i}
                      className={`rb-glyph${g === "○" ? " empty" : ""}`}
                    >
                      {g}
                    </span>
                  ))}
                </div>
                <button className="rb-cta">+ New Session →</button>
              </div>

              {/* ── KITSU POD ── */}
              <div className="rb-cluster rb-cluster-kitsu">
                <div style={{ position: "relative", display: "inline-block" }}>
                  <div className="rb-kitsu-ring" />
                  <div className="rb-kitsu-pod">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/agent-office/pixel/marvis-kitsune.png"
                      alt="Kitsu"
                      className="rb-kitsu-img"
                    />
                  </div>
                </div>
                <span className="rb-kitsu-label">Kitsu</span>
                <span className="rb-kitsu-status">● Idle</span>
              </div>

              {/* ── GAUGE CLUSTER ── */}
              <div
                className="rb-cluster rb-cluster-gauges"
                style={{ padding: "16px 20px" }}
              >
                <span
                  className="rb-label"
                  style={{ marginBottom: "12px", display: "block" }}
                >
                  Project Gauges
                </span>

                <div className="rb-gauge">
                  <div className="rb-gauge-header">
                    <div>
                      <div className="rb-gauge-name">personal-os</div>
                      <div className="rb-gauge-branch">cockpit · 2d</div>
                    </div>
                    <span className="rb-status-badge">Active</span>
                  </div>
                  <div className="rb-gauge-row">
                    <div className="rb-gauge-stat">
                      <span className="rb-label">CTX</span>
                      <span className="rb-stat-val amber">48%</span>
                    </div>
                    <div className="rb-gauge-stat">
                      <span className="rb-label">Tool</span>
                      <span className="rb-tool-tag">
                        mcp_claude-in-chrome__browser_batch
                      </span>
                    </div>
                    <div className="rb-ctx-bar-wrap">
                      <div className="rb-ctx-bar" style={{ width: "48%" }} />
                    </div>
                  </div>
                </div>

                <div className="rb-gauge">
                  <div className="rb-gauge-header">
                    <div>
                      <div className="rb-gauge-name">metrasens</div>
                      <div className="rb-gauge-branch">signal-hub · 4d</div>
                    </div>
                    <span className="rb-status-badge blocked">Blocked</span>
                  </div>
                  <div className="rb-gauge-row">
                    <div className="rb-gauge-stat">
                      <span className="rb-label">Issue</span>
                      <span
                        className="rb-stat-val alert"
                        style={{
                          fontSize: "12px",
                          fontFamily: "Geist Mono, monospace",
                          letterSpacing: "0.04em",
                        }}
                      >
                        MRE bucket
                      </span>
                    </div>
                    <div className="rb-gauge-stat">
                      <span className="rb-label">Decision</span>
                      <span className="rb-tool-tag">UPGRADE or CURRENT?</span>
                    </div>
                    <div className="rb-ctx-bar-wrap">
                      <div
                        className="rb-ctx-bar alert"
                        style={{ width: "72%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ACTIVITY CLUSTER ── */}
              <div className="rb-cluster rb-cluster-activity">
                <span
                  className="rb-label"
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
                  <div key={row.time} className="rb-activity-row">
                    <span className="rb-act-time">{row.time}</span>
                    <span className="rb-act-msg">{row.msg}</span>
                    <span className="rb-act-diff">{row.diff}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── STATUS STRIP ── */}
            <div className="rb-strip">
              <div className="rb-strip-item">
                <span className="rb-strip-key">Time</span>
                <span className="rb-strip-val">23:14</span>
              </div>
              <div className="rb-strip-sep" />
              <div className="rb-strip-item">
                <span className="rb-strip-key">CTX</span>
                <span className="rb-strip-val warn">48%</span>
              </div>
              <div className="rb-strip-sep" />
              <div className="rb-strip-item">
                <span className="rb-strip-key">Build</span>
                <span className="rb-strip-val ok">✓ Healthy</span>
              </div>
              <div className="rb-strip-sep" />
              <div className="rb-strip-item">
                <span className="rb-strip-key">Sessions</span>
                <span className="rb-strip-val">3 live</span>
              </div>
              <div className="rb-strip-sep" />
              <div className="rb-strip-item">
                <span className="rb-strip-key">Commits</span>
                <span className="rb-strip-val">
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
