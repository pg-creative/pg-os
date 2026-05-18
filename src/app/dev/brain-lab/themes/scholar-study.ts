import type { BrainTheme } from "../shared/ThemeAssets";

export const scholarStudy: BrainTheme = {
  id: "scholar-study",
  name: "Scholar's Study",
  tagline: "Howl's library at golden hour",
  palette: {
    bg: "#f5ecd7",
    bgImage: "/brain-lab/heroes/scholar-study/1.png",
    surface: "rgba(247, 239, 220, 0.92)",
    surfaceAlt: "#ede0c2",
    ink: "#2d1f10",
    inkMuted: "#6b5634",
    accent: "#b8770d", // golden amber
    accent2: "#6a3e8a", // royal purple wax-seal
    line: "rgba(45, 31, 16, 0.18)",
    tierHigh: "#7a1830", // ruby wax
    tierMid: "#b8770d", // amber wax
    tierLow: "#2a5a7a", // sapphire wax
    tierKill: "#5a534a", // gray wax
  },
  fonts: {
    display: '"Cormorant Garamond", "Iowan Old Style", Georgia, serif',
    body: '"Crimson Pro", "Iowan Old Style", Georgia, serif',
    mono: '"JetBrains Mono", "SF Mono", Menlo, monospace',
    smallCaps: '"Cormorant Upright SC", "Cormorant Garamond", serif',
    cssImports: [
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Cormorant+Upright:wght@500;600&display=swap",
    ],
  },
  hero: {
    paths: [
      "/brain-lab/heroes/scholar-study/1.png",
      "/brain-lab/heroes/scholar-study/2.png",
      "/brain-lab/heroes/scholar-study/3.png",
      "/brain-lab/heroes/scholar-study/4.png",
    ],
  },
  audio: {
    pixabayLoopUrl: null, // TBD: fill with cozy fireplace / library ambience
    spotifyEmbedUrl:
      "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ", // Deep Focus
  },
  motion: {
    transitionMs: 800,
    hoverLift: "translateY(-3px) rotate(-0.4deg)",
  },
};
