import type { BrainTheme } from "../shared/ThemeAssets";

export const kodamaGrove: BrainTheme = {
  id: "kodama-grove",
  name: "Kodama Grove",
  tagline: "Spirits gathered, runes glowing in the moss",
  palette: {
    bg: "#0d1f1a",
    bgImage: "/brain-lab/heroes/kodama-grove/4.png",
    surface: "rgba(28, 50, 35, 0.85)",
    surfaceAlt: "rgba(60, 78, 50, 0.7)",
    ink: "#f0ead4",
    inkMuted: "rgba(240, 234, 212, 0.6)",
    accent: "#f5c449", // golden dapple
    accent2: "#7ab896", // moss green
    line: "rgba(240, 234, 212, 0.12)",
    tierHigh: "#d04a5e", // ruby rune
    tierMid: "#f5c449", // gold rune
    tierLow: "#7ab896", // moss rune
    tierKill: "#4a4438",
  },
  fonts: {
    display: '"Cinzel", "Iowan Old Style", Georgia, serif',
    body: '"EB Garamond", "Iowan Old Style", Georgia, serif',
    mono: '"JetBrains Mono", monospace',
    smallCaps: '"IM Fell English SC", "Cinzel", serif',
    cssImports: [
      "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=IM+Fell+English+SC&display=swap",
    ],
  },
  hero: {
    paths: [
      "/brain-lab/heroes/kodama-grove/1.png",
      "/brain-lab/heroes/kodama-grove/2.png",
      "/brain-lab/heroes/kodama-grove/3.png",
      "/brain-lab/heroes/kodama-grove/4.png",
    ],
  },
  audio: {
    pixabayLoopUrl: null,
    spotifyEmbedUrl:
      "https://open.spotify.com/embed/playlist/37i9dQZF1DXbITWG1ZJKYt", // Jazz Vibes (placeholder — pick forest ambient)
  },
  motion: {
    transitionMs: 700,
    hoverLift: "translateY(-2px) scale(1.04)",
  },
};
