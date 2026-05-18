import type { BrainTheme } from "../shared/ThemeAssets";

export const skyWorld: BrainTheme = {
  id: "sky-world",
  name: "Sky World",
  tagline: "Laputa at golden hour, cards on warm thermals",
  palette: {
    bg: "linear-gradient(180deg, #2a3a6e 0%, #c97a3b 60%, #f0c87a 100%)",
    bgImage: "/brain-lab/heroes/sky-world/4.png",
    surface: "rgba(255, 240, 210, 0.94)",
    surfaceAlt: "rgba(200, 175, 130, 0.9)",
    ink: "#2a1f10",
    inkMuted: "#5c4a30",
    accent: "#e89035", // amber sunset
    accent2: "#4a7ca8", // sky blue
    line: "rgba(42, 31, 16, 0.16)",
    tierHigh: "#d04a5e", // ruby
    tierMid: "#e89035", // amber
    tierLow: "#4a7ca8", // sapphire
    tierKill: "#7a7268",
  },
  fonts: {
    display: '"Spectral", "Iowan Old Style", Georgia, serif',
    body: '"Inter", "Helvetica Neue", sans-serif',
    mono: '"Major Mono Display", "JetBrains Mono", monospace',
    cssImports: [
      "https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&family=Major+Mono+Display&display=swap",
    ],
  },
  hero: {
    paths: [
      "/brain-lab/heroes/sky-world/1.png",
      "/brain-lab/heroes/sky-world/2.png",
      "/brain-lab/heroes/sky-world/3.png",
      "/brain-lab/heroes/sky-world/4.png",
    ],
  },
  audio: {
    pixabayLoopUrl: null,
    spotifyEmbedUrl:
      "https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn", // Lofi Beats
  },
  motion: {
    transitionMs: 1000,
    hoverLift: "translateY(-6px)",
  },
};
