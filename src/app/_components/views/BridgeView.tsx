"use client";
import { CrewRail } from "../bridge/CrewRail";
import { CommsFeed } from "../bridge/CommsFeed";
import { StatusRail } from "../bridge/StatusRail";
import { LiveClock } from "../LiveClock";
import { Greeting } from "../ModeSwitcher";
import { CardGlyph, SparkleCorner } from "../CardGlyph";

/**
 * BridgeView — Cortana-style command center.
 * Layout: cinematic Ghibli hero banner across the top, then 3-col grid
 * below: Crew (left) | Comms (center) | Status (right).
 *
 * The hero banner uses the same `.card.session` styling as PersonalView so
 * the Laputa hero PNGs (palette-aware via --hero-0) anchor the bridge in
 * the established aesthetic instead of plain panels.
 */

export function BridgeView() {
  return (
    <>
      {/* Cinematic hero — palette-aware Ghibli scene + greeting */}
      <div className="card session bridge-session">
        <SparkleCorner delayed variant="plus" />
        <div className="card-label">
          <span className="left">
            <CardGlyph name="sun" />
            <span>00 // BRIDGE</span>
          </span>
        </div>
        <div className="clock">
          <div className="tz">UTC -05:00 · CDT</div>
          <div className="time"><LiveClock /></div>
          <div className="local">LOCAL TIME</div>
        </div>
        <div>
          <div className="greeting">Good <Greeting /> Patrick.</div>
          <div className="datestamp"><LiveDatestamp /></div>
        </div>
      </div>

      {/* Command center grid */}
      <div className="bridge">
        <CrewRail />
        <CommsFeed />
        <StatusRail />
      </div>
    </>
  );
}

function LiveDatestamp() {
  const d = new Date();
  const DOW = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  const MON = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
  return <>{`${DOW[d.getDay()]} · ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · DAY ${dayOfYear} OF 365`}</>;
}
