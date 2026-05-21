"use client";

// ─── Arm C — "Nioh Kodama Kitsune" (shrine instrument panel) ─────────────────
// Lacquer-black + sumi-ink panels, kintsugi-gold engraved seams, foxfire-ember
// amber as live signal, drifting kodama orb in gauge backgrounds, torii hush.
// /art/aesthetic-2026-05-20/nioh-hero_0.png layered faintly behind hero cluster.

export default function ReckoningC() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@300;400;500;600&display=swap');

        .rc-root {
          --bg:         #060608;
          --panel:      #0d0d10;
          --panel-2:    #0a0a0d;
          --rule:       #1a1820;
          --kintsugi:   #c8900a;
          --foxfire:    #f0a020;
          --foxfire-2:  #e06810;
          --kodama:     rgba(200,230,210,0.06);
          --green:      #4ab88a;
          --muted:      #282630;
          --alert:      #c85030;
          --text:       #b8b0c0;
          --text-dim:   #484050;
          --text-gold:  #c8a060;
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

        /* Scanline */
        .rc-root::before {
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
          z-index: 101;
          opacity: 0.03;
        }

        /* Subtle ink-wash vignette */
        .rc-root::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 50%, rgba(200,144,10,0.03) 0%, transparent 60%),
            radial-gradient(ellipse 40% 80% at 90% 20%, rgba(180,100,20,0.025) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .rc-layout {
          display: flex;
          width: 100%;
          height: 100%;
          min-height: 640px;
          position: relative;
          z-index: 1;
        }

        /* ── NAV RAIL — lacquer pillar ── */
        .rc-nav {
          width: 56px;
          background: #080809;
          border-right: 1px solid var(--kintsugi);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 0;
          gap: 4px;
          flex-shrink: 0;
          position: relative;
        }

        /* Kintsugi seam glow on rail edge */
        .rc-nav::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0; right: -1px;
          width: 1px;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(200,144,10,0.5) 20%,
            rgba(200,144,10,0.8) 50%,
            rgba(200,144,10,0.5) 80%,
            transparent 100%
          );
        }

        .rc-wordmark {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--kintsugi);
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          margin-bottom: 16px;
          opacity: 0.9;
          text-shadow: 0 0 16px rgba(200,144,10,0.5);
        }

        .rc-nav-item {
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

        .rc-nav-item.active {
          background: rgba(200, 144, 10, 0.1);
          color: var(--foxfire);
        }

        .rc-nav-item.active::before {
          content: '';
          position: absolute;
          left: -1px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: linear-gradient(180deg, var(--foxfire), var(--kintsugi));
          border-radius: 0 2px 2px 0;
          box-shadow: 0 0 10px rgba(200,144,10,0.6);
        }

        .rc-nav-item:hover:not(.active) {
          background: rgba(200,144,10,0.04);
          color: var(--text);
        }

        .rc-nav-icon {
          font-family: 'Geist Mono', monospace;
          font-size: 12px;
          font-weight: 600;
        }

        /* ── MAIN CANVAS ── */
        .rc-canvas {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .rc-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: auto 1fr auto;
          gap: 1px;
          background: var(--kintsugi);
          border-bottom: 1px solid var(--kintsugi);
        }

        .rc-cluster {
          background: var(--panel);
          padding: 18px 20px;
          position: relative;
          overflow: hidden;
        }

        /* Kodama orb floating in background of every cluster */
        .rc-cluster::after {
          content: '';
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(200,230,210,0.08) 0%, transparent 70%);
          bottom: 12px;
          right: 16px;
          animation: rc-kodama-float 8s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes rc-kodama-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
          33% { transform: translateY(-6px) scale(1.05); opacity: 0.9; }
          66% { transform: translateY(3px) scale(0.95); opacity: 0.6; }
        }

        .rc-cluster-hero {
          grid-column: 1 / 3;
          grid-row: 1;
          padding: 24px 28px;
          background: var(--panel-2);
        }

        /* Nioh hero image faintly behind hero cluster */
        .rc-cluster-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: url('/art/aesthetic-2026-05-20/nioh-hero_0.png') center/cover no-repeat;
          opacity: 0.05;
          mix-blend-mode: luminosity;
          pointer-events: none;
          z-index: 0;
        }

        .rc-hero-content {
          position: relative;
          z-index: 1;
        }

        .rc-cluster-kitsu {
          grid-column: 3;
          grid-row: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
          gap: 12px;
          background: #080809;
        }

        .rc-cluster-gauges {
          grid-column: 1 / 3;
          grid-row: 2;
        }

        .rc-cluster-activity {
          grid-column: 3;
          grid-row: 2;
          background: var(--panel-2);
        }

        /* ── FIELDS ── */
        .rc-label {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 3px;
          display: block;
        }

        .rc-eyebrow {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--kintsugi);
          opacity: 0.9;
          margin-bottom: 10px;
          display: block;
          text-shadow: 0 0 20px rgba(200,144,10,0.4);
        }

        .rc-h1 {
          font-family: 'Geist', sans-serif;
          font-size: 22px;
          font-weight: 400;
          line-height: 1.2;
          color: #d0c8d8;
          margin: 0 0 8px;
          letter-spacing: -0.01em;
        }

        .rc-subhead {
          font-family: 'Geist', sans-serif;
          font-size: 12px;
          line-height: 1.7;
          color: var(--text-dim);
          max-width: 520px;
          font-weight: 300;
          font-style: italic;
        }

        /* ── GAUGE CARD ── */
        .rc-gauge {
          padding: 16px 18px;
          border: 1px solid var(--rule);
          border-radius: 3px;
          margin-bottom: 10px;
          background: var(--panel-2);
          position: relative;
          overflow: hidden;
        }

        /* Kintsugi-gold seam along gauge top edge */
        .rc-gauge::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(200,144,10,0.4), transparent);
        }

        .rc-gauge:last-child { margin-bottom: 0; }

        .rc-gauge-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .rc-gauge-name {
          font-family: 'Geist Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-gold);
          letter-spacing: 0.04em;
        }

        .rc-gauge-branch {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 0.05em;
        }

        .rc-status-badge {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 2px;
          background: rgba(74,184,138,0.08);
          color: var(--green);
          border: 1px solid rgba(74,184,138,0.2);
        }

        .rc-status-badge.blocked {
          background: rgba(200, 80, 48, 0.1);
          color: var(--alert);
          border-color: rgba(200, 80, 48, 0.25);
        }

        .rc-gauge-row {
          display: flex;
          gap: 24px;
          align-items: center;
        }

        .rc-gauge-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .rc-stat-val {
          font-family: 'Geist Mono', monospace;
          font-size: 16px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          color: var(--text);
        }

        .rc-stat-val.amber {
          color: var(--foxfire);
          text-shadow: 0 0 14px rgba(240,160,32,0.35);
        }

        .rc-stat-val.alert { color: var(--alert); }

        .rc-ctx-bar-wrap {
          flex: 1;
          height: 3px;
          background: var(--rule);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 18px;
        }

        .rc-ctx-bar {
          height: 100%;
          background: linear-gradient(90deg, rgba(200,144,10,0.7), rgba(240,168,32,1));
          border-radius: 2px;
          box-shadow: 0 0 8px rgba(200,144,10,0.5);
          transition: width 0.4s cubic-bezier(0.2, 0, 0, 1);
        }

        .rc-ctx-bar.alert {
          background: linear-gradient(90deg, rgba(200,80,48,0.7), rgba(200,80,48,1));
          box-shadow: 0 0 8px rgba(200,80,48,0.4);
        }

        .rc-tool-tag {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          color: var(--text-dim);
          background: rgba(26,24,32,0.9);
          padding: 2px 7px;
          border-radius: 2px;
          letter-spacing: 0.08em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
          display: inline-block;
          border: 1px solid rgba(200,144,10,0.08);
        }

        /* ── ACTIVITY ── */
        .rc-activity-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 10px 0;
          border-bottom: 1px solid var(--rule);
          position: relative;
          z-index: 1;
        }

        .rc-activity-row:last-child { border-bottom: none; }

        /* Kintsugi seam under each activity row */
        .rc-activity-row::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(200,144,10,0.12), transparent);
        }

        .rc-act-time {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          color: var(--text-dim);
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
          padding-top: 1px;
          letter-spacing: 0.05em;
        }

        .rc-act-msg {
          font-family: 'Geist', sans-serif;
          font-size: 12px;
          color: var(--text);
          flex: 1;
          line-height: 1.4;
          font-style: italic;
        }

        .rc-act-diff {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          color: var(--green);
          flex-shrink: 0;
          letter-spacing: 0.04em;
        }

        /* ── KITSU POD ── */
        .rc-kitsu-pod {
          width: 80px;
          height: 80px;
          border-radius: 14px;
          border: 1px solid rgba(200,144,10,0.4);
          overflow: hidden;
          position: relative;
          background: var(--bg);
          box-shadow:
            inset 0 0 0 1px rgba(200,144,10,0.06),
            0 0 24px rgba(200,144,10,0.12);
        }

        /* Kintsugi corner seam on pod */
        .rc-kitsu-pod::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 14px;
          background:
            linear-gradient(135deg, rgba(200,144,10,0.4) 0%, transparent 30%) padding-box,
            linear-gradient(135deg, rgba(200,144,10,0.4), transparent 40%) border-box;
          z-index: 2;
          pointer-events: none;
        }

        .rc-kitsu-ring {
          position: absolute;
          inset: -5px;
          border-radius: 19px;
          border: 1px solid transparent;
          background:
            linear-gradient(var(--panel), var(--panel)) padding-box,
            conic-gradient(
              from 0deg,
              transparent 0%,
              rgba(200,144,10,0.6) 25%,
              rgba(240,160,32,0.8) 50%,
              rgba(200,144,10,0.4) 75%,
              transparent 100%
            ) border-box;
          animation: rc-ring-spin 6s linear infinite;
        }

        @keyframes rc-ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .rc-kitsu-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          position: relative;
          z-index: 1;
        }

        .rc-kitsu-label {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--kintsugi);
          text-align: center;
          text-shadow: 0 0 14px rgba(200,144,10,0.5);
        }

        .rc-kitsu-status {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          color: var(--text-dim);
          letter-spacing: 0.1em;
          text-align: center;
        }

        /* ── CTA ── */
        .rc-cta {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--kintsugi);
          background: rgba(200, 144, 10, 0.06);
          border: 1px solid rgba(200, 144, 10, 0.3);
          padding: 8px 18px;
          border-radius: 2px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 0 12px rgba(200,144,10,0.06);
          position: relative;
        }

        /* Kintsugi seam on CTA */
        .rc-cta::before {
          content: '';
          position: absolute;
          bottom: 0; left: 15%; right: 15%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(200,144,10,0.5), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .rc-cta:hover {
          background: rgba(200, 144, 10, 0.12);
          border-color: rgba(200, 144, 10, 0.5);
          box-shadow: 0 0 20px rgba(200,144,10,0.15);
        }

        .rc-cta:hover::before { opacity: 1; }

        .rc-streak {
          display: flex;
          gap: 5px;
          align-items: center;
          margin-top: 10px;
        }

        .rc-glyph {
          font-size: 11px;
          color: var(--foxfire);
          text-shadow: 0 0 10px rgba(240,160,32,0.5);
        }

        .rc-glyph.empty {
          color: var(--muted);
          text-shadow: none;
        }

        /* ── STATUS STRIP — shrine base plate ── */
        .rc-strip {
          height: 32px;
          background: #060608;
          border-top: 1px solid var(--kintsugi);
          display: flex;
          align-items: center;
          padding: 0 20px;
          gap: 28px;
          flex-shrink: 0;
          position: relative;
        }

        /* Kintsugi seam glow on strip top */
        .rc-strip::before {
          content: '';
          position: absolute;
          top: -1px; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(200,144,10,0.6) 20%,
            rgba(240,168,32,0.8) 50%,
            rgba(200,144,10,0.6) 80%,
            transparent 100%
          );
        }

        .rc-strip-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rc-strip-key {
          font-family: 'Geist Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-dim);
        }

        .rc-strip-val {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          font-weight: 500;
          color: var(--text);
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.04em;
        }

        .rc-strip-val.ok {
          color: var(--green);
        }

        .rc-strip-val.warn {
          color: var(--foxfire);
          text-shadow: 0 0 8px rgba(240,160,32,0.3);
        }

        .rc-strip-sep {
          width: 1px;
          height: 14px;
          background: linear-gradient(180deg, transparent, rgba(200,144,10,0.3), transparent);
        }
      `}</style>

      <div className="rc-root">
        <div className="rc-layout">
          {/* ── NAV RAIL ── */}
          <nav className="rc-nav">
            <span className="rc-wordmark">PG OS</span>
            {[
              { key: "H", label: "Home", active: true },
              { key: "Hb", label: "Habits", active: false },
              { key: "Pj", label: "Projects", active: false },
              { key: "Fl", label: "Flow", active: false },
              { key: "Cl", label: "Claude", active: false },
            ].map((item) => (
              <div
                key={item.key}
                className={`rc-nav-item${item.active ? " active" : ""}`}
                title={item.label}
              >
                <span className="rc-nav-icon">{item.key}</span>
              </div>
            ))}
          </nav>

          {/* ── MAIN CANVAS ── */}
          <div className="rc-canvas">
            <div className="rc-grid">
              {/* ── HERO CLUSTER ── */}
              <div className="rc-cluster rc-cluster-hero">
                <div className="rc-hero-content">
                  <span className="rc-eyebrow">
                    Late Night · Kitsu Is Watching The Fleet
                  </span>
                  <h1 className="rc-h1">
                    Three sessions live,
                    <br />
                    one waiting on your call.
                  </h1>
                  <p className="rc-subhead">
                    Three sessions live, one waiting on your call. The night is
                    quiet — a good time to ship the thing you keep circling.
                  </p>
                  <div className="rc-streak">
                    <span className="rc-label" style={{ marginBottom: 0 }}>
                      Streak
                    </span>
                    {["●", "●", "●", "○"].map((g, i) => (
                      <span
                        key={i}
                        className={`rc-glyph${g === "○" ? " empty" : ""}`}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  <button className="rc-cta">+ New Session →</button>
                </div>
              </div>

              {/* ── KITSU POD ── */}
              <div className="rc-cluster rc-cluster-kitsu">
                <div style={{ position: "relative", display: "inline-block" }}>
                  <div className="rc-kitsu-ring" />
                  <div className="rc-kitsu-pod">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/agent-office/pixel/marvis-kitsune.png"
                      alt="Kitsu"
                      className="rc-kitsu-img"
                    />
                  </div>
                </div>
                <span className="rc-kitsu-label">Kitsu</span>
                <span className="rc-kitsu-status">● Idle</span>
              </div>

              {/* ── GAUGE CLUSTER ── */}
              <div
                className="rc-cluster rc-cluster-gauges"
                style={{ padding: "16px 20px" }}
              >
                <span
                  className="rc-label"
                  style={{ marginBottom: "12px", display: "block" }}
                >
                  Project Gauges
                </span>

                {/* Gauge 1 */}
                <div className="rc-gauge">
                  <div className="rc-gauge-header">
                    <div>
                      <div className="rc-gauge-name">personal-os</div>
                      <div className="rc-gauge-branch">cockpit · 2d</div>
                    </div>
                    <span className="rc-status-badge">Active</span>
                  </div>
                  <div className="rc-gauge-row">
                    <div className="rc-gauge-stat">
                      <span className="rc-label">CTX</span>
                      <span className="rc-stat-val amber">48%</span>
                    </div>
                    <div className="rc-gauge-stat">
                      <span className="rc-label">Tool</span>
                      <span className="rc-tool-tag">
                        mcp_claude-in-chrome__browser_batch
                      </span>
                    </div>
                    <div className="rc-ctx-bar-wrap">
                      <div className="rc-ctx-bar" style={{ width: "48%" }} />
                    </div>
                  </div>
                </div>

                {/* Gauge 2 */}
                <div className="rc-gauge">
                  <div className="rc-gauge-header">
                    <div>
                      <div className="rc-gauge-name">metrasens</div>
                      <div className="rc-gauge-branch">signal-hub · 4d</div>
                    </div>
                    <span className="rc-status-badge blocked">Blocked</span>
                  </div>
                  <div className="rc-gauge-row">
                    <div className="rc-gauge-stat">
                      <span className="rc-label">Issue</span>
                      <span
                        className="rc-stat-val alert"
                        style={{
                          fontSize: "12px",
                          fontFamily: "Geist Mono, monospace",
                          letterSpacing: "0.04em",
                        }}
                      >
                        MRE bucket
                      </span>
                    </div>
                    <div className="rc-gauge-stat">
                      <span className="rc-label">Decision</span>
                      <span className="rc-tool-tag">UPGRADE or CURRENT?</span>
                    </div>
                    <div className="rc-ctx-bar-wrap">
                      <div
                        className="rc-ctx-bar alert"
                        style={{ width: "72%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ACTIVITY CLUSTER ── */}
              <div className="rc-cluster rc-cluster-activity">
                <span
                  className="rc-label"
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
                  <div key={row.time} className="rc-activity-row">
                    <span className="rc-act-time">{row.time}</span>
                    <span className="rc-act-msg">{row.msg}</span>
                    <span className="rc-act-diff">{row.diff}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── STATUS STRIP ── */}
            <div className="rc-strip">
              <div className="rc-strip-item">
                <span className="rc-strip-key">Time</span>
                <span className="rc-strip-val">23:14</span>
              </div>
              <div className="rc-strip-sep" />
              <div className="rc-strip-item">
                <span className="rc-strip-key">CTX</span>
                <span className="rc-strip-val warn">48%</span>
              </div>
              <div className="rc-strip-sep" />
              <div className="rc-strip-item">
                <span className="rc-strip-key">Build</span>
                <span className="rc-strip-val ok">✓ Healthy</span>
              </div>
              <div className="rc-strip-sep" />
              <div className="rc-strip-item">
                <span className="rc-strip-key">Sessions</span>
                <span className="rc-strip-val">3 live</span>
              </div>
              <div className="rc-strip-sep" />
              <div className="rc-strip-item">
                <span className="rc-strip-key">Commits</span>
                <span className="rc-strip-val">
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
