"use client";
import { useState } from "react";
import { useTheme } from "./ThemeProvider";

// SpotifyEmbed
// - Hidden by default behind a toggle pill.
// - Lazy-loads the Spotify iframe only when activated.
// - Allows AmbientPlayer + Spotify to coexist (user can choose).

export function SpotifyEmbed() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const url = theme.audio.spotifyEmbedUrl;
  if (!url) return null;

  return (
    <div className="bl-spotify">
      <button
        type="button"
        className="bl-spotify-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? "× spotify" : "▶ spotify"}
      </button>
      {open && (
        <iframe
          className="bl-spotify-iframe"
          src={url + "?utm_source=brain-lab"}
          width="100%"
          height="80"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}
    </div>
  );
}
