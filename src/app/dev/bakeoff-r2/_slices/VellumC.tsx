"use client";

// ─── Arm C — "Nioh kodama kitsune" (suits the fox) ───────────────────────────
// Same Vellum structure; reskinned into the Nioh fox-spirit world.
// Deep sumi-e ink base, drifting kodama orbs, foxfire ember glints,
// kintsugi gold seam accents, misty atmosphere.
// Faint painted backdrop from /art/aesthetic-2026-05-20/nioh-hero_0.png.

export default function VellumC() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@400;500&family=Literata:ital,opsz,wght@0,7..72,300;0,7..72,400;1,7..72,300&display=swap');

        .vc-root {
          --bg:           #0C0D0F;
          --bg-raised:    #131418;
          --text:         #D8CEB8;
          --muted:        #6A6858;
          --kintsugi:     #C8A84A;
          --foxfire:      #E8C050;
          --foxfire-cool: #78B8C8;
          --spirit:       rgba(200,168,74,0.18);
          --rule:         #1E2028;
          --danger:       #C05840;
          --ok:           #78A888;
          --grid:         24px;
          background: var(--bg);
          color: var(--text);
          font-family: 'Literata', Georgia, serif;
          font-size: 15px;
          line-height: var(--grid);
          min-height: 640px;
          position: relative;
          overflow: hidden;
        }

        /* Painted backdrop — Nioh hero at very low opacity */
        .vc-backdrop {
          position: fixed;
          inset: 0;
          background-image: url('/art/aesthetic-2026-05-20/nioh-hero_0.png');
          background-size: cover;
          background-position: center top;
          opacity: 0.07;
          pointer-events: none;
          z-index: 0;
          mix-blend-mode: luminosity;
        }

        /* Misty vignette over backdrop */
        .vc-mist {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse 120% 80% at 50% 0%, transparent 30%, var(--bg) 90%);
          pointer-events: none;
          z-index: 1;
        }

        /* Kodama spirit orbs — floating white wisps */
        .vc-orbs {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          overflow: hidden;
        }
        .vc-orb {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(220,230,240,0.55) 0%, transparent 70%);
          animation: vc-drift linear infinite;
        }
        .vc-orb:nth-child(1) { width:10px; height:10px; left:12%;  top:30%; animation-duration:18s; animation-delay:-4s;  opacity:0.35; }
        .vc-orb:nth-child(2) { width:7px;  height:7px;  left:28%;  top:55%; animation-duration:24s; animation-delay:-11s; opacity:0.25; }
        .vc-orb:nth-child(3) { width:12px; height:12px; left:68%;  top:20%; animation-duration:21s; animation-delay:-7s;  opacity:0.3;  }
        .vc-orb:nth-child(4) { width:6px;  height:6px;  left:80%;  top:60%; animation-duration:16s; animation-delay:-2s;  opacity:0.2;  }
        .vc-orb:nth-child(5) { width:9px;  height:9px;  left:45%;  top:75%; animation-duration:28s; animation-delay:-15s; opacity:0.28; }

        @keyframes vc-drift {
          0%   { transform: translate(0, 0) scale(1); opacity: 0; }
          10%  { opacity: 1; }
          50%  { transform: translate(-18px, -60px) scale(1.15); }
          90%  { opacity: 1; }
          100% { transform: translate(8px, -130px) scale(0.8); opacity: 0; }
        }

        /* Foxfire ember glints — small warm dots */
        .vc-embers {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          overflow: hidden;
        }
        .vc-ember {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--foxfire);
          animation: vc-ember-float linear infinite;
          filter: blur(0.5px);
        }
        .vc-ember:nth-child(1) { left:20%;  top:40%; animation-duration:9s;  animation-delay:-2s;  opacity:0.7; }
        .vc-ember:nth-child(2) { left:55%;  top:65%; animation-duration:12s; animation-delay:-5s;  opacity:0.5; }
        .vc-ember:nth-child(3) { left:75%;  top:35%; animation-duration:8s;  animation-delay:-1s;  opacity:0.6; }
        .vc-ember:nth-child(4) { left:38%;  top:80%; animation-duration:11s; animation-delay:-8s;  opacity:0.45; }
        .vc-ember:nth-child(5) { left:88%;  top:50%; animation-duration:10s; animation-delay:-3s;  opacity:0.55; }
        .vc-ember:nth-child(6) { left:62%;  top:25%; animation-duration:14s; animation-delay:-6s;  opacity:0.4; }

        @keyframes vc-ember-float {
          0%   { transform: translate(0,0) scale(1);   opacity: 0; }
          15%  { opacity: 1; }
          60%  { transform: translate(-8px,-55px) scale(0.7); }
          85%  { opacity: 0.6; }
          100% { transform: translate(5px,-100px) scale(0.3); opacity: 0; }
        }

        /* Nav ribbon */
        .vc-nav {
          position: sticky;
          top: 0;
          z-index: 40;
          height: 40px;
          background: rgba(12,13,15,0.92);
          border-bottom: 1px solid var(--rule);
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 6px;
          backdrop-filter: blur(6px);
        }
        /* Kintsugi seam on nav bottom edge */
        .vc-nav::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 24px;
          width: 120px;
          height: 1px;
          background: linear-gradient(90deg, var(--kintsugi), transparent);
          opacity: 0.6;
        }
        .vc-wordmark {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.16em;
          color: var(--kintsugi);
          margin-right: 18px;
          text-transform: uppercase;
          text-shadow: 0 0 14px rgba(200,168,74,0.4);
        }
        .vc-pill {
          padding: 3px 12px;
          border-radius: 999px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.04em;
          color: var(--muted);
          border: 1px solid transparent;
          cursor: default;
        }
        .vc-pill-active {
          color: var(--kintsugi);
          border-color: rgba(200,168,74,0.3);
          background: rgba(200,168,74,0.07);
        }

        /* Layout shell */
        .vc-shell {
          display: grid;
          grid-template-columns: 14px 1fr 22%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
          gap: 0 24px;
          position: relative;
          z-index: 5;
        }

        /* Left marginalia */
        .vc-marginalia {
          padding-top: 48px;
          display: flex;
          flex-direction: column;
          gap: 48px;
          align-items: flex-end;
        }
        .vc-marginal-label {
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
        .vc-main {
          max-width: 900px;
          padding-top: 48px;
          padding-bottom: 72px;
        }

        /* Kitsu sidebar */
        .vc-kitsu-col {
          padding-top: 48px;
        }
        .vc-kitsu-sticky {
          position: sticky;
          top: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        /* Kitsune frame — torii-arch shape via clip-path + kintsugi border */
        .vc-kitsu-frame {
          width: 72px;
          height: 72px;
          border-radius: 50% 50% 8px 8px;
          border: 1px solid rgba(200,168,74,0.45);
          overflow: hidden;
          background: var(--bg-raised);
          box-shadow:
            0 0 0 1px rgba(200,168,74,0.15),
            0 0 22px rgba(200,168,74,0.15),
            0 0 8px rgba(120,184,200,0.1);
          position: relative;
        }
        /* Foxfire glow aura around avatar */
        .vc-kitsu-frame::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: inherit;
          background: radial-gradient(circle, rgba(200,168,74,0.25) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .vc-kitsu-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          image-rendering: pixelated;
          position: relative;
          z-index: 1;
        }
        .vc-kitsu-name {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 12px;
          color: var(--kintsugi);
          letter-spacing: 0.08em;
          text-shadow: 0 0 10px rgba(200,168,74,0.3);
        }
        .vc-kitsu-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: var(--muted);
          text-align: center;
          letter-spacing: 0.04em;
          line-height: 1.5;
        }

        /* Ink-bleed reveal */
        @keyframes vc-inkbleed {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vc-reveal { animation: vc-inkbleed 0.5s ease both; }
        .vc-reveal-d1 { animation-delay: 0ms; }
        .vc-reveal-d2 { animation-delay: 80ms; }
        .vc-reveal-d3 { animation-delay: 160ms; }
        .vc-reveal-d4 { animation-delay: 240ms; }
        .vc-reveal-d5 { animation-delay: 320ms; }
        .vc-reveal-d6 { animation-delay: 400ms; }
        .vc-reveal-d7 { animation-delay: 480ms; }

        /* Hero */
        .vc-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .vc-h1 {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          font-size: 48px;
          line-height: 1.1;
          color: var(--text);
          margin-bottom: 16px;
          letter-spacing: -0.01em;
        }
        .vc-h1 em {
          color: var(--kintsugi);
          font-style: italic;
          text-shadow: 0 0 24px rgba(200,168,74,0.3);
        }
        .vc-subhead {
          font-size: 15px;
          line-height: 24px;
          color: var(--muted);
          max-width: 560px;
          margin-bottom: 36px;
        }

        /* Rule — kintsugi seam */
        .vc-rule {
          border: none;
          border-top: 1px solid var(--rule);
          margin: 36px 0;
          position: relative;
        }
        .vc-rule::after {
          content: '';
          position: absolute;
          top: -1px;
          left: 0;
          width: 60px;
          height: 1px;
          background: linear-gradient(90deg, var(--kintsugi), transparent);
          opacity: 0.7;
        }

        /* Section label */
        .vc-section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.14em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        /* Project insets — sumi-e wash + kintsugi left seam */
        .vc-project-inset {
          border: 1px solid var(--rule);
          border-left: 2px solid var(--kintsugi);
          border-radius: 0 2px 2px 0;
          padding: 16px 20px;
          margin-bottom: 12px;
          background: linear-gradient(90deg, rgba(200,168,74,0.04) 0%, rgba(19,20,24,0.8) 35%);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 4px 16px;
          align-items: start;
          position: relative;
        }
        .vc-project-inset.blocked {
          border-left-color: var(--danger);
          background: linear-gradient(90deg, rgba(192,88,64,0.05) 0%, rgba(19,20,24,0.8) 35%);
        }
        .vc-project-name {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
          font-size: 17px;
          color: var(--text);
        }
        .vc-project-stat {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--ok);
          text-align: right;
          padding-top: 3px;
        }
        .vc-project-stat.danger { color: var(--danger); }
        .vc-project-meta {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 0.04em;
        }
        .vc-project-body {
          font-size: 13px;
          line-height: 20px;
          color: var(--muted);
          grid-column: 1 / -1;
          margin-top: 6px;
          font-family: 'JetBrains Mono', monospace;
        }

        /* Activity rows */
        .vc-activity-row {
          display: grid;
          grid-template-columns: 44px 1fr auto;
          gap: 0 16px;
          padding: 10px 0;
          border-bottom: 1px solid var(--rule);
          align-items: baseline;
        }
        .vc-activity-row:last-child { border-bottom: none; }
        .vc-activity-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--muted);
        }
        .vc-activity-desc {
          font-size: 14px;
          color: var(--text);
        }
        .vc-activity-diff {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--ok);
          white-space: nowrap;
        }

        /* CTA — spirit-fire outline */
        .vc-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 32px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.08em;
          color: var(--kintsugi);
          background: transparent;
          border: 1px solid rgba(200,168,74,0.4);
          border-radius: 2px;
          padding: 8px 18px;
          cursor: pointer;
          text-transform: uppercase;
          position: relative;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .vc-cta::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(200,168,74,0.06), transparent);
          border-radius: inherit;
          pointer-events: none;
        }
        .vc-cta:hover {
          border-color: rgba(200,168,74,0.7);
          box-shadow: 0 0 16px rgba(200,168,74,0.2);
        }
      `}</style>

      <div className="vc-root">
        {/* Painted backdrop */}
        <div className="vc-backdrop" aria-hidden="true" />
        <div className="vc-mist" aria-hidden="true" />

        {/* Kodama orbs */}
        <div className="vc-orbs" aria-hidden="true">
          <div className="vc-orb" />
          <div className="vc-orb" />
          <div className="vc-orb" />
          <div className="vc-orb" />
          <div className="vc-orb" />
        </div>

        {/* Foxfire embers */}
        <div className="vc-embers" aria-hidden="true">
          <div className="vc-ember" />
          <div className="vc-ember" />
          <div className="vc-ember" />
          <div className="vc-ember" />
          <div className="vc-ember" />
          <div className="vc-ember" />
        </div>

        {/* Nav ribbon */}
        <nav className="vc-nav">
          <span className="vc-wordmark">PG OS</span>
          <span className="vc-pill vc-pill-active">Home</span>
          <span className="vc-pill">Habits</span>
          <span className="vc-pill">Projects</span>
          <span className="vc-pill">Flow</span>
          <span className="vc-pill">Claude</span>
        </nav>

        <div className="vc-shell">
          {/* Left marginalia */}
          <div className="vc-marginalia">
            <span className="vc-marginal-label">ctx 48%</span>
            <span className="vc-marginal-label">streak ●●○</span>
            <span className="vc-marginal-label">blocked</span>
            <span className="vc-marginal-label">▁▃▅▇</span>
          </div>

          {/* Main content */}
          <main className="vc-main">
            <p className="vc-eyebrow vc-reveal vc-reveal-d1">
              Late night · Kitsu is watching the fleet
            </p>
            <h1 className="vc-h1 vc-reveal vc-reveal-d2">
              The fleet holds.
              <br />
              <em>Ship the thing</em> you keep circling.
            </h1>
            <p className="vc-subhead vc-reveal vc-reveal-d3">
              Three sessions live, one waiting on your call. The night is quiet
              — a good time to ship the thing you keep circling.
            </p>

            <hr className="vc-rule vc-reveal vc-reveal-d4" />

            <p className="vc-section-label vc-reveal vc-reveal-d4">
              Active sessions
            </p>

            <div className="vc-project-inset vc-reveal vc-reveal-d5">
              <span className="vc-project-name">personal-os</span>
              <span className="vc-project-stat">ctx 48%</span>
              <span className="vc-project-meta">cockpit · 2d</span>
              <span className="vc-project-meta" />
              <p className="vc-project-body">
                mcp_claude-in-chrome__browser_batch
              </p>
            </div>

            <div className="vc-project-inset blocked vc-reveal vc-reveal-d5">
              <span className="vc-project-name">metrasens</span>
              <span className="vc-project-stat danger">blocked</span>
              <span className="vc-project-meta">signal-hub · 4d</span>
              <span className="vc-project-meta" />
              <p className="vc-project-body">
                MRE bucket — UPGRADE or CURRENT?
              </p>
            </div>

            <hr className="vc-rule vc-reveal vc-reveal-d6" />

            <p className="vc-section-label vc-reveal vc-reveal-d6">
              Recent activity
            </p>

            <div className="vc-reveal vc-reveal-d7">
              <div className="vc-activity-row">
                <span className="vc-activity-time">09:58</span>
                <span className="vc-activity-desc">
                  legibility foundation shipped
                </span>
                <span className="vc-activity-diff">+711 −0</span>
              </div>
              <div className="vc-activity-row">
                <span className="vc-activity-time">09:24</span>
                <span className="vc-activity-desc">
                  party mode — Kitsu sings first
                </span>
                <span className="vc-activity-diff">+180 −44</span>
              </div>
              <div className="vc-activity-row">
                <span className="vc-activity-time">08:51</span>
                <span className="vc-activity-desc">fox head reframed</span>
                <span className="vc-activity-diff">+12 −9</span>
              </div>
            </div>

            <button className="vc-cta vc-reveal vc-reveal-d7">
              + New session →
            </button>
          </main>

          {/* Kitsu column */}
          <aside className="vc-kitsu-col">
            <div className="vc-kitsu-sticky">
              <div className="vc-kitsu-frame">
                <img src="/agent-office/pixel/marvis-kitsune.png" alt="Kitsu" />
              </div>
              <span className="vc-kitsu-name">Kitsu</span>
              <span className="vc-kitsu-status">
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
