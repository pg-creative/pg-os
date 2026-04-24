import { SparkleCorner, CardGlyph } from "../CardGlyph";
import { ReactNode } from "react";

export function ComingSoonCard({
  num,
  title,
  glyph = "sparkles",
  children,
}: {
  num: string;
  title: string;
  glyph?: "sun" | "star" | "heart" | "sparkles" | "feather" | "music" | "compass";
  children?: ReactNode;
}) {
  return (
    <div className="card coming-soon">
      <SparkleCorner variant="star" />
      <div className="card-label">
        <span className="left">
          <CardGlyph name={glyph} />
          <span>{num} // {title}</span>
        </span>
        <span className="tag">COMING</span>
      </div>
      <div className="cs-body">{children}</div>
    </div>
  );
}
