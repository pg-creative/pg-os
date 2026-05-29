"use client";

// ─── Arm A — "as conceived" (neutral night vellum) ───────────────────────────
// Palette: ink bg #1A1410 · cream text #E8DCC8 · ember accent #E8813A
// Aged-vellum-at-night editorial restraint. Zero PG-taste additions.

export default function VellumA() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@400;500&family=Literata:ital,opsz,wght@0,7..72,300;0,7..72,400;1,7..72,300&display=swap');

        .va-root {
          --bg:        #1A1410;
          --bg-raised: #211A14;
          --text:      #E8DCC8;
          --muted:     #7A6A58;
          --accent:    #E8813A;
          --rule:      #3A2E24;
          --danger:    #C45A3A;
          --ok:        #8A9E6A;
          --grid:      24px;
          background: var(--bg);
          color: var(--text);
          font-family: 'Literata', Georgia, serif;
          font-size: 15px;
          line-height: var(--grid);
          min-height: 640px;
          position: relative;
        }

        /* Nav ribbon */
        .va-nav {
          position: sticky;
          top: 0;
          z-index: 40;
          height: 40px;
          background: var(--bg);
          border-bottom: 1px solid var(--rule);
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 6px;
        }
        .va-wordmark {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.12em;
          color: var(--text);
          margin-right: 18px;
          text-transform: uppercase;
        }
        .va-pill {
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
        .va-pill-active {
          color: var(--text);
          border-color: var(--rule);
          background: var(--bg-raised);
        }

        /* Layout shell */
        .va-shell {
          display: grid;
          grid-template-columns: 14px 1fr 22%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
          gap: 0 24px;
          position: relative;
        }

        /* Left marginalia */
        .va-marginalia {
          padding-top: 48px;
          display: flex;
          flex-direction: column;
          gap: 48px;
          align-items: flex-end;
        }
        .va-marginal-label {
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
        .va-main {
          max-width: 900px;
          padding-top: 48px;
          padding-bottom: 72px;
        }

        /* Kitsu sidebar */
        .va-kitsu-col {
          padding-top: 48px;
        }
        .va-kitsu-sticky {
          position: sticky;
          top: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .va-kitsu-frame {
          width: 72px;
          height: 72px;
          border-radius: 12px;
          border: 1px solid var(--rule);
          overflow: hidden;
          background: var(--bg-raised);
        }
        .va-kitsu-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          image-rendering: pixelated;
        }
        .va-kitsu-name {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: var(--muted);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .va-kitsu-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: var(--accent);
          letter-spacing: 0.04em;
          text-align: center;
        }

        /* Ink-bleed reveal */
        @keyframes va-inkbleed {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .va-reveal {
          animation: va-inkbleed 0.5s ease both;
        }
        .va-reveal-d1 { animation-delay: 0ms; }
        .va-reveal-d2 { animation-delay: 80ms; }
        .va-reveal-d3 { animation-delay: 160ms; }
        .va-reveal-d4 { animation-delay: 240ms; }
        .va-reveal-d5 { animation-delay: 320ms; }
        .va-reveal-d6 { animation-delay: 400ms; }
        .va-reveal-d7 { animation-delay: 480ms; }

        /* Hero */
        .va-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .va-h1 {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          font-size: 48px;
          line-height: 1.1;
          color: var(--text);
          margin-bottom: 16px;
          letter-spacing: -0.01em;
        }
        .va-h1 em {
          color: var(--accent);
          font-style: italic;
        }
        .va-subhead {
          font-size: 15px;
          line-height: 24px;
          color: var(--muted);
          max-width: 560px;
          margin-bottom: 36px;
        }

        /* Rule */
        .va-rule {
          border: none;
          border-top: 1px solid var(--rule);
          margin: 36px 0;
        }

        /* Section label */
        .va-section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.14em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        /* Project insets */
        .va-project-inset {
          border: 1px solid var(--rule);
          border-radius: 4px;
          padding: 16px 20px;
          margin-bottom: 12px;
          background: var(--bg-raised);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 4px 16px;
          align-items: start;
        }
        .va-project-name {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
          font-size: 17px;
          color: var(--text);
        }
        .va-project-stat {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--ok);
          text-align: right;
          padding-top: 3px;
        }
        .va-project-stat.danger {
          color: var(--danger);
        }
        .va-project-meta {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 0.04em;
        }
        .va-project-body {
          font-size: 13px;
          line-height: 20px;
          color: var(--muted);
          grid-column: 1 / -1;
          margin-top: 6px;
          font-family: 'JetBrains Mono', monospace;
        }

        /* Activity rows */
        .va-activity-row {
          display: grid;
          grid-template-columns: 44px 1fr auto;
          gap: 0 16px;
          padding: 10px 0;
          border-bottom: 1px solid var(--rule);
          align-items: baseline;
        }
        .va-activity-row:last-child { border-bottom: none; }
        .va-activity-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--muted);
        }
        .va-activity-desc {
          font-size: 14px;
          color: var(--text);
        }
        .va-activity-diff {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--ok);
          white-space: nowrap;
        }

        /* CTA */
        .va-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 32px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.08em;
          color: var(--accent);
          border: 1px solid var(--accent);
          border-radius: 3px;
          padding: 8px 18px;
          cursor: pointer;
          text-transform: uppercase;
          transition: background 0.15s;
        }
        .va-cta:hover { background: rgba(232,129,58,0.1); }
      `}</style>

      <div className="va-root">
        {/* Nav ribbon */}
        <nav className="va-nav">
          <span className="va-wordmark">PG OS</span>
          <span className="va-pill va-pill-active">Home</span>
          <span className="va-pill">Habits</span>
          <span className="va-pill">Projects</span>
          <span className="va-pill">Flow</span>
          <span className="va-pill">Claude</span>
        </nav>

        <div className="va-shell">
          {/* Left marginalia */}
          <div className="va-marginalia">
            <span className="va-marginal-label">ctx 48%</span>
            <span className="va-marginal-label">streak ●●○</span>
            <span className="va-marginal-label">blocked</span>
            <span className="va-marginal-label">▁▃▅▇</span>
          </div>

          {/* Main content */}
          <main className="va-main">
            {/* Hero */}
            <p className="va-eyebrow va-reveal va-reveal-d1">
              Late night · Kitsu is watching the fleet
            </p>
            <h1 className="va-h1 va-reveal va-reveal-d2">
              The fleet holds.
              <br />
              <em>Ship the thing</em> you keep circling.
            </h1>
            <p className="va-subhead va-reveal va-reveal-d3">
              Three sessions live, one waiting on your call. The night is quiet
              — a good time to ship the thing you keep circling.
            </p>

            <hr className="va-rule va-reveal va-reveal-d4" />

            {/* Projects */}
            <p className="va-section-label va-reveal va-reveal-d4">
              Active sessions
            </p>

            <div className="va-project-inset va-reveal va-reveal-d5">
              <span className="va-project-name">personal-os</span>
              <span className="va-project-stat">ctx 48%</span>
              <span className="va-project-meta">cockpit · 2d</span>
              <span className="va-project-meta" />
              <p className="va-project-body">
                mcp_claude-in-chrome__browser_batch
              </p>
            </div>

            <div className="va-project-inset va-reveal va-reveal-d5">
              <span className="va-project-name">metrasens</span>
              <span className="va-project-stat danger">blocked</span>
              <span className="va-project-meta">signal-hub · 4d</span>
              <span className="va-project-meta" />
              <p className="va-project-body">
                MRE bucket — UPGRADE or CURRENT?
              </p>
            </div>

            <hr className="va-rule va-reveal va-reveal-d6" />

            {/* Activity */}
            <p className="va-section-label va-reveal va-reveal-d6">
              Recent activity
            </p>

            <div className="va-reveal va-reveal-d7">
              <div className="va-activity-row">
                <span className="va-activity-time">09:58</span>
                <span className="va-activity-desc">
                  legibility foundation shipped
                </span>
                <span className="va-activity-diff">+711 −0</span>
              </div>
              <div className="va-activity-row">
                <span className="va-activity-time">09:24</span>
                <span className="va-activity-desc">
                  party mode — Kitsu sings first
                </span>
                <span className="va-activity-diff">+180 −44</span>
              </div>
              <div className="va-activity-row">
                <span className="va-activity-time">08:51</span>
                <span className="va-activity-desc">fox head reframed</span>
                <span className="va-activity-diff">+12 −9</span>
              </div>
            </div>

            <button className="va-cta va-reveal va-reveal-d7">
              + New session →
            </button>
          </main>

          {/* Kitsu column */}
          <aside className="va-kitsu-col">
            <div className="va-kitsu-sticky">
              <div className="va-kitsu-frame">
                <img src="/agent-office/pixel/marvis-kitsune.png" alt="Kitsu" />
              </div>
              <span className="va-kitsu-name">Kitsu</span>
              <span className="va-kitsu-status">
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
