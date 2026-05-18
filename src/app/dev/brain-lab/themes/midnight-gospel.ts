import type { BrainTheme } from "../shared/ThemeAssets";

// FALSIFIER — intentionally outside PG's locked aesthetic.
// Tests whether psychedelic cosmic-drone beauty wins over Ghibli warmth.
export const midnightGospel: BrainTheme = {
  id: "midnight-gospel",
  name: "Midnight Gospel",
  tagline: "Multiverse portals, ringed orbs, cosmic drone",
  palette: {
    bg: "radial-gradient(ellipse at center, #1a0a3a 0%, #050218 60%, #02010a 100%)",
    bgImage: "/brain-lab/heroes/midnight-gospel/1.png",
    surface: "rgba(80, 50, 140, 0.18)",
    surfaceAlt: "rgba(120, 80, 200, 0.12)",
    ink: "#f0e4ff",
    inkMuted: "rgba(240, 228, 255, 0.55)",
    accent: "#ff6bdc", // psychedelic pink
    accent2: "#5ae6ff", // electric cyan
    line: "rgba(240, 228, 255, 0.15)",
    tierHigh: "#ff6bdc", // pink portal
    tierMid: "#ffdf7a", // gold orb
    tierLow: "#5ae6ff", // cyan ring
    tierKill: "#3a2a4a",
  },
  fonts: {
    display: '"Bowlby One SC", "Impact", sans-serif',
    body: '"Space Grotesk", "Inter", sans-serif',
    mono: '"VT323", "Courier New", monospace',
    cssImports: [
      "https://fonts.googleapis.com/css2?family=Bowlby+One+SC&family=Space+Grotesk:wght@300;400;500;600;700&family=VT323&display=swap",
    ],
  },
  hero: {
    paths: [
      "/brain-lab/heroes/midnight-gospel/1.png",
      "/brain-lab/heroes/midnight-gospel/2.png",
      "/brain-lab/heroes/midnight-gospel/3.png",
      "/brain-lab/heroes/midnight-gospel/4.png",
    ],
  },
  audio: {
    pixabayLoopUrl: null,
    spotifyEmbedUrl:
      "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO", // Peaceful Piano (placeholder — pick cosmic drone)
  },
  motion: {
    transitionMs: 1200,
    hoverLift: "scale(1.08) rotate(2deg)",
  },
};
