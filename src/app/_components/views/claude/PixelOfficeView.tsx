"use client";

/**
 * Pixel Office sub-view for the Claude tab. Wraps the vendored
 * pixel-agents <App /> component, manages the SSE lifecycle, and
 * gives it a fixed-height container (the upstream UI expects 100%
 * width/height of its parent).
 */

import { useEffect } from "react";
import { connectWebSocket, cleanup } from "./PixelOffice/wsApi";
import App from "./PixelOffice/App";
import "./PixelOffice/index.css";

export function PixelOfficeView() {
  useEffect(() => {
    connectWebSocket();
    return cleanup;
  }, []);

  return (
    <section id="cl-office" className="cl-section">
      <header className="cl-section-head">
        <h2 className="cl-section-title">OFFICE</h2>
        <p className="cl-section-sub">
          Live Claude Code sessions as pixel characters.
        </p>
      </header>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "640px",
          overflow: "hidden",
          background: "#1a1a24",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <App />
      </div>
    </section>
  );
}
