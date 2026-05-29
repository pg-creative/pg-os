"use client";

// ─── Arm B — "golden-hour" (PG taste) ────────────────────────────────────────
// Same Vellum structure; palette pushed to Ghibli golden-hour warmth.
// Luminous cream+gold, jewel-tone accents, soft golden glow/light-leak.
// Still a manuscript — but bathed in golden light.

export default function VellumB() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@400;500&family=Literata:ital,opsz,wght@0,7..72,300;0,7..72,400;1,7..72,300&display=swap');

        .vb-root {
          --bg:        #14100A;
          --bg-raised: #1C160D;
          --bg-glow:   rgba(232,176,56,0.06);
          --text:      #F2E6C8;
          --muted:     #9A856A;
          --accent:    #E8B038;
          --emerald:   #5A9E72;
          --ruby:      #C45A3A;
          --rule:      #2E2418;
          --danger:    #C45A3A;
          --ok:        #5A9E72;
          --glow:      rgba(232,176,56,0.18);
          --grid:      24px;
          background: var(--bg);
          color: var(--text);
          font-family: 'Literata', Georgia, serif;
          font-size: 15px;
          line-height: var(--grid);
          min-height: 640px;
          position: relative;
          overflow: hidden;
        }

        /* Golden light-leak — top-right radial */
        .vb-root::before {
          content: '';
          position: fixed;
          top: -120px;
          right: -80px;
          width: 480px;
          height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(232,176,56,0.13) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Nav ribbon */
        .vb-nav {
          position: sticky;
          top: 0;
          z-index: 40;
          height: 40px;
          background: linear-gradient(90deg, var(--bg) 0%, rgba(20,16,10,0.97) 100%);
          border-bottom: 1px solid var(--rule);
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 6px;
        }
        .vb-wordmark {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.12em;
          color: var(--accent);
          margin-right: 18px;
          text-transform: uppercase;
          text-shadow: 0 0 18px rgba(232,176,56,0.4);
        }
        .vb-pill {
          padding: 3px 12px;
          border-radius: 999px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.04em;
          color: var(--muted);
          border: 1px solid transparent;
          cursor: default;
          transition: color 0.15s;
        }
        .vb-pill-active {
          color: var(--accent);
          border-color: rgba(232,176,56,0.35);
          background: rgba(232,176,56,0.08);
        }

        /* Layout shell */
        .vb-shell {
          display: grid;
          grid-template-columns: 14px 1fr 22%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
          gap: 0 24px;
          position: relative;
          z-index: 1;
        }

        /* Left marginalia */
        .vb-marginalia {
          padding-top: 48px;
          display: flex;
          flex-direction: column;
          gap: 48px;
          align-items: flex-end;
        }
        .vb-marginal-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
          color: var(--muted);
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          white-space: nowrap;
        }

        /* Main column */
        .vb-main {
          max-width: 900px;
          padding-top: 48px;
          padding-bottom: 72px;
        }

        /* Kitsu sidebar */
        .vb-kitsu-col {
          padding-top: 48px;
        }
        .vb-kitsu-sticky {
          position: sticky;
          top: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .vb-kitsu-frame {
          width: 72px;
          height: 72px;
          border-radius: 14px;
          border: 1px solid rgba(232,176,56,0.35);
          overflow: hidden;
          background: var(--bg-raised);
          box-shadow: 0 0 22px rgba(232,176,56,0.18), inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .vb-kitsu-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          image-rendering: pixelated;
        }
        .vb-kitsu-name {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: var(--accent);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .vb-kitsu-status {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 11px;
          color: var(--muted);
          text-align: center;
          line-height: 1.4;
        }

        /* Ink-bleed reveal */
        @keyframes vb-inkbleed {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vb-reveal { animation: vb-inkbleed 0.5s ease both; }
        .vb-reveal-d1 { animation-delay: 0ms; }
        .vb-reveal-d2 { animation-delay: 80ms; }
        .vb-reveal-d3 { animation-delay: 160ms; }
        .vb-reveal-d4 { animation-delay: 240ms; }
        .vb-reveal-d5 { animation-delay: 320ms; }
        .vb-reveal-d6 { animation-delay: 400ms; }
        .vb-reveal-d7 { animation-delay: 480ms; }

        /* Hero */
        .vb-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .vb-h1 {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          font-size: 48px;
          line-height: 1.1;
          color: var(--text);
          margin-bottom: 16px;
          letter-spacing: -0.01em;
        }
        .vb-h1 em {
          color: var(--accent);
          font-style: italic;
          text-shadow: 0 0 28px rgba(232,176,56,0.35);
        }
        .vb-subhead {
          font-size: 15px;
          line-height: 24px;
          color: var(--muted);
          max-width: 560px;
          margin-bottom: 36px;
        }

        /* Rule — golden tint */
        .vb-rule {
          border: none;
          border-top: 1px solid var(--rule);
          margin: 36px 0;
          position: relative;
        }
        .vb-rule::after {
          content: '';
          position: absolute;
          top: -1px;
          left: 0;
          width: 80px;
          height: 1px;
          background: linear-gradient(90deg, var(--accent), transparent);
          opacity: 0.5;
        }

        /* Section label */
        .vb-section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.14em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        /* Project insets — jewel tone left-border */
        .vb-project-inset {
          border: 1px solid var(--rule);
          border-left: 2px solid var(--accent);
          border-radius: 0 4px 4px 0;
          padding: 16px 20px;
          margin-bottom: 12px;
          background: linear-gradient(90deg, rgba(232,176,56,0.05) 0%, var(--bg-raised) 40%);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 4px 16px;
          align-items: start;
        }
        .vb-project-inset.blocked {
          border-left-color: var(--ruby);
          background: linear-gradient(90deg, rgba(196,90,58,0.06) 0%, var(--bg-raised) 40%);
        }
        .vb-project-name {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
          font-size: 17px;
          color: var(--text);
        }
        .vb-project-stat {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--emerald);
          text-align: right;
          padding-top: 3px;
        }
        .vb-project-stat.danger { color: var(--ruby); }
        .vb-project-meta {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 0.04em;
        }
        .vb-project-body {
          font-size: 13px;
          line-height: 20px;
          color: var(--muted);
          grid-column: 1 / -1;
          margin-top: 6px;
          font-family: 'JetBrains Mono', monospace;
        }

        /* Activity rows */
        .vb-activity-row {
          display: grid;
          grid-template-columns: 44px 1fr auto;
          gap: 0 16px;
          padding: 10px 0;
          border-bottom: 1px solid var(--rule);
          align-items: baseline;
        }
        .vb-activity-row:last-child { border-bottom: none; }
        .vb-activity-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--muted);
        }
        .vb-activity-desc {
          font-size: 14px;
          color: var(--text);
        }
        .vb-activity-diff {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--emerald);
          white-space: nowrap;
        }

        /* CTA — warm golden */
        .vb-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 32px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.08em;
          color: var(--bg);
          background: var(--accent);
          border: none;
          border-radius: 3px;
          padding: 8px 20px;
          cursor: pointer;
          text-transform: uppercase;
          box-shadow: 0 0 18px rgba(232,176,56,0.28);
          transition: box-shadow 0.2s, opacity 0.2s;
        }
        .vb-cta:hover {
          opacity: 0.88;
          box-shadow: 0 0 28px rgba(232,176,56,0.45);
        }
      `}</style>

      <div className="vb-root">
        {/* Nav ribbon */}
        <nav className="vb-nav">
          <span className="vb-wordmark">PG OS</span>
          <span className="vb-pill vb-pill-active">Home</span>
          <span className="vb-pill">Habits</span>
          <span className="vb-pill">Projects</span>
          <span className="vb-pill">Flow</span>
          <span className="vb-pill">Claude</span>
        </nav>

        <div className="vb-shell">
          {/* Left marginalia */}
          <div className="vb-marginalia">
            <span className="vb-marginal-label">ctx 48%</span>
            <span className="vb-marginal-label">streak ●●○</span>
            <span className="vb-marginal-label">blocked</span>
            <span className="vb-marginal-label">▁▃▅▇</span>
          </div>

          {/* Main content */}
          <main className="vb-main">
            <p className="vb-eyebrow vb-reveal vb-reveal-d1">
              Late night · Kitsu is watching the fleet
            </p>
            <h1 className="vb-h1 vb-reveal vb-reveal-d2">
              The fleet holds.
              <br />
              <em>Ship the thing</em> you keep circling.
            </h1>
            <p className="vb-subhead vb-reveal vb-reveal-d3">
              Three sessions live, one waiting on your call. The night is quiet
              — a good time to ship the thing you keep circling.
            </p>

            <hr className="vb-rule vb-reveal vb-reveal-d4" />

            <p className="vb-section-label vb-reveal vb-reveal-d4">
              Active sessions
            </p>

            <div className="vb-project-inset vb-reveal vb-reveal-d5">
              <span className="vb-project-name">personal-os</span>
              <span className="vb-project-stat">ctx 48%</span>
              <span className="vb-project-meta">cockpit · 2d</span>
              <span className="vb-project-meta" />
              <p className="vb-project-body">
                mcp_claude-in-chrome__browser_batch
              </p>
            </div>

            <div className="vb-project-inset blocked vb-reveal vb-reveal-d5">
              <span className="vb-project-name">metrasens</span>
              <span className="vb-project-stat danger">blocked</span>
              <span className="vb-project-meta">signal-hub · 4d</span>
              <span className="vb-project-meta" />
              <p className="vb-project-body">
                MRE bucket — UPGRADE or CURRENT?
              </p>
            </div>

            <hr className="vb-rule vb-reveal vb-reveal-d6" />

            <p className="vb-section-label vb-reveal vb-reveal-d6">
              Recent activity
            </p>

            <div className="vb-reveal vb-reveal-d7">
              <div className="vb-activity-row">
                <span className="vb-activity-time">09:58</span>
                <span className="vb-activity-desc">
                  legibility foundation shipped
                </span>
                <span className="vb-activity-diff">+711 −0</span>
              </div>
              <div className="vb-activity-row">
                <span className="vb-activity-time">09:24</span>
                <span className="vb-activity-desc">
                  party mode — Kitsu sings first
                </span>
                <span className="vb-activity-diff">+180 −44</span>
              </div>
              <div className="vb-activity-row">
                <span className="vb-activity-time">08:51</span>
                <span className="vb-activity-desc">fox head reframed</span>
                <span className="vb-activity-diff">+12 −9</span>
              </div>
            </div>

            <button className="vb-cta vb-reveal vb-reveal-d7">
              + New session →
            </button>
          </main>

          {/* Kitsu column */}
          <aside className="vb-kitsu-col">
            <div className="vb-kitsu-sticky">
              <div className="vb-kitsu-frame">
                <img src="/agent-office/pixel/marvis-kitsune.png" alt="Kitsu" />
              </div>
              <span className="vb-kitsu-name">Kitsu</span>
              <span className="vb-kitsu-status">
                watching
                <br />
                the fleet
              </span>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
