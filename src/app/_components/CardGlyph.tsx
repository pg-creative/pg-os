import { JSX } from "react";

export type GlyphName =
  | "star" | "sun" | "heart" | "cloud" | "sparkles"
  | "feather" | "music" | "compass";

const PATHS: Record<GlyphName, JSX.Element> = {
  star: <path d="M7 1 L8.5 5.5 L13 7 L8.5 8.5 L7 13 L5.5 8.5 L1 7 L5.5 5.5 Z" fill="currentColor" />,
  sun: (
    <>
      <circle cx="7" cy="7" r="2.5" fill="currentColor" />
      <path d="M7 0 V3 M7 11 V14 M0 7 H3 M11 7 H14 M2 2 L4 4 M10 10 L12 12 M12 2 L10 4 M4 10 L2 12" stroke="currentColor" strokeWidth="1" fill="none" />
    </>
  ),
  heart: <path d="M7 13 C7 13 1 9 1 5 C1 3 3 2 5 3 L7 5 L9 3 C11 2 13 3 13 5 C13 9 7 13 7 13 Z" fill="currentColor" />,
  cloud: <path d="M3 9 C1 9 1 6 3 6 C3 4 5 3 7 4 C8 3 11 4 11 6 C13 6 13 9 11 9 Z" fill="currentColor" />,
  sparkles: <path d="M7 2 L8 6 L12 7 L8 8 L7 12 L6 8 L2 7 L6 6 Z M3 2 L3.5 3 L4.5 3.5 L3.5 4 L3 5 L2.5 4 L1.5 3.5 L2.5 3 Z M11 10 L11.5 11 L12.5 11.5 L11.5 12 L11 13 L10.5 12 L9.5 11.5 L10.5 11 Z" fill="currentColor" />,
  feather: <path d="M2 5 C2 3 5 1 7 3 C9 1 12 3 12 5 C12 9 7 12 7 12 C7 12 2 9 2 5 Z" fill="currentColor" />,
  music: <path d="M4 11 V3 L11 2 V9 M4 11 C4 12 2 12 2 11 C2 10 4 10 4 11 Z M11 9 C11 10 9 10 9 9 C9 8 11 8 11 9 Z" fill="currentColor" />,
  compass: <path d="M7 1 L10 4 L7 7 L4 4 Z M1 7 L4 10 L1 13 L1 10 Z M13 7 L10 10 L13 13 L13 10 Z M4 10 L10 10" fill="none" stroke="currentColor" strokeWidth="1.2" />,
};

export function CardGlyph({ name }: { name: GlyphName }) {
  return (
    <span className="glyph">
      <svg viewBox="0 0 14 14" width="14" height="14">{PATHS[name]}</svg>
    </span>
  );
}

export function SparkleCorner({ delayed = false, variant = "star" }: { delayed?: boolean; variant?: "star" | "plus" | "swirl" }) {
  const paths = {
    star: <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="currentColor" />,
    plus: (
      <>
        <circle cx="5" cy="5" r="1.5" fill="currentColor" />
        <path d="M5 0 V3 M5 7 V10 M0 5 H3 M7 5 H10" stroke="currentColor" strokeWidth="1" fill="none" />
      </>
    ),
    swirl: <path d="M5 1 Q8 3 5 5 Q2 7 5 9 M3 2 Q5 3 6 2 M4 8 Q6 7 7 8" stroke="currentColor" strokeWidth="1" fill="none" />,
  };
  return (
    <div className={`sparkle-corner${delayed ? " delayed" : ""}`}>
      <svg viewBox="0 0 10 10" width="10" height="10">{paths[variant]}</svg>
    </div>
  );
}
