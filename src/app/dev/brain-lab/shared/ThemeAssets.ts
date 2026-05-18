// Brain Lab theme contract — every variant theme conforms to this shape.

export interface BrainTheme {
  id: string;
  name: string;
  tagline: string;
  palette: {
    bg: string;
    bgImage?: string; // optional hero image as backdrop
    surface: string;
    surfaceAlt: string;
    ink: string;
    inkMuted: string;
    accent: string;
    accent2: string;
    line: string;
    tierHigh: string; // score >= 14
    tierMid: string; // 10-13
    tierLow: string; // < 10
    tierKill: string;
  };
  fonts: {
    display: string;
    body: string;
    mono: string;
    cssImports: string[]; // <link> href URLs OR @import statements
    smallCaps?: string;
  };
  hero: {
    paths: string[]; // 4 hero images from public/brain-lab/heroes/<variant>/
  };
  audio: {
    pixabayLoopUrl: string | null; // direct mp3 URL (CC0); null = no ambient
    spotifyEmbedUrl: string | null; // https://open.spotify.com/embed/playlist/...
  };
  motion: {
    transitionMs: number; // crossfade duration
    hoverLift: string; // CSS transform on hover
  };
}
