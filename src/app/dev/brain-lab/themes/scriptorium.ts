import type { BrainTheme } from "../shared/ThemeAssets";

export const scriptorium: BrainTheme = {
  id: "scriptorium",
  name: "Scriptorium",
  tagline: "Illuminated manuscripts, wax seals broken",
  palette: {
    bg: "#1a1208",
    bgImage: "/brain-lab/heroes/scriptorium/4.png",
    surface: "#f3e6c4", // vellum
    surfaceAlt: "#dcc594",
    ink: "#1e1409",
    inkMuted: "#6b4f2c",
    accent: "#b8202a", // illuminated red
    accent2: "#cb9b3a", // gold leaf
    line: "rgba(30, 20, 9, 0.22)",
    tierHigh: "#b8202a", // ruby seal
    tierMid: "#cb9b3a", // amber seal
    tierLow: "#2b6388", // sapphire seal
    tierKill: "#5a5040",
  },
  fonts: {
    display: '"UnifrakturMaguntia", "Iowan Old Style", Georgia, serif',
    body: '"EB Garamond", Georgia, serif',
    mono: '"IM Fell DW Pica SC", "JetBrains Mono", monospace',
    smallCaps: '"IM Fell DW Pica SC", "EB Garamond", serif',
    cssImports: [
      "https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=IM+Fell+DW+Pica+SC&display=swap",
    ],
  },
  hero: {
    paths: [
      "/brain-lab/heroes/scriptorium/1.png",
      "/brain-lab/heroes/scriptorium/2.png",
      "/brain-lab/heroes/scriptorium/3.png",
      "/brain-lab/heroes/scriptorium/4.png",
    ],
  },
  audio: {
    pixabayLoopUrl: null,
    spotifyEmbedUrl:
      "https://open.spotify.com/embed/playlist/37i9dQZF1DXbITWG1ZJKYt", // placeholder — pick medieval ambient
  },
  motion: {
    transitionMs: 600,
    hoverLift: "translateY(-2px) rotate(0.6deg)",
  },
};
