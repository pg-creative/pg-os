"use client";
import { LiveClock } from "../LiveClock";
import { CardGlyph, SparkleCorner } from "../CardGlyph";
import { CalendarEvents } from "../CalendarEvents";
import { NowPlayingLive } from "../NowPlayingLive";
import { VitalsLive } from "../VitalsLive";
import { Greeting } from "../ModeSwitcher";
import { LocationLive } from "../LocationLive";
import { PostMortemBanner } from "../PostMortemBanner";
import { PushSetupCard } from "../PushSetupCard";

export function PersonalView() {
  return (
    <>
      <PostMortemBanner />
      <PushSetupCard />
      {/* SESSION BANNER — full-width, time-responsive hero image */}
      <div className="card session">
        <SparkleCorner delayed variant="plus" />
        <div className="card-label">
          <span className="left">
            <CardGlyph name="sun" />
            <span>02 // SESSION</span>
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

      <div className="grid">
        {/* OPERATOR */}
        <div className="card operator">
          <SparkleCorner variant="star" />
          <div className="card-label">
            <span className="left"><CardGlyph name="star" /><span>01 // OPERATOR</span></span>
            <span className="tag live">ONLINE</span>
          </div>
          <div className="op-body">
            <div className="avatar">PG</div>
            <div className="op-info">
              <h2>Patrick <em>Smith</em></h2>
              <div className="meta">GTM ENGINEER · CHICAGO</div>
              <div className="op-kv">
                <div><span className="k">FOCUS</span><span className="v">DEEP WORK</span></div>
                <div><span className="k">STATUS</span><span className="v">DND</span></div>
                <div><span className="k">RANK</span><span className="v">A · TIER III</span></div>
                <div><span className="k">STREAK</span><span className="v">29 DAYS</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* CALENDAR (spans 2 rows) */}
        <div className="card calendar">
          <SparkleCorner delayed variant="star" />
          <div className="card-label">
            <span className="left"><CardGlyph name="sparkles" /><span>04 // CALENDAR</span></span>
            <span className="tag">APR 2026</span>
          </div>
          <div className="cal-title">Tuesday, <em>April 22</em></div>
          <div className="days">
            {(["MON","TUE","WED","THU","FRI","SAT","SUN"] as const).map((d, i) => (
              <div className="day" key={d}>{d}<span className="num">{14 + i}</span></div>
            ))}
          </div>
          <div className="days" style={{ marginBottom: 18 }}>
            <div className="day today">WED<span className="num">22</span></div>
            {(["THU","FRI","SAT","SUN","MON","TUE"] as const).map((d, i) => (
              <div className="day" key={d}>{d}<span className="num">{23 + i}</span></div>
            ))}
          </div>
          <CalendarEvents />
        </div>

        {/* VITALS */}
        <div className="card vitals">
          <SparkleCorner variant="swirl" />
          <div className="card-label">
            <span className="left"><CardGlyph name="heart" /><span>03 // VITALS</span></span>
            <span className="tag live">LIVE</span>
          </div>
          <VitalsLive />
        </div>

        {/* LOCATION (spans 2 rows) */}
        <div className="card location">
          <div className="loc-bg" />
          <div className="loc-body">
            <div className="card-label" style={{ color: "var(--fg-dim)" }}>
              <span className="left">
                <span className="glyph" style={{ color: "var(--fg-dim)" }}>
                  <svg viewBox="0 0 14 14" width="14" height="14">
                    <path d="M3 9 C1 9 1 6 3 6 C3 4 5 3 7 4 C8 3 11 4 11 6 C13 6 13 9 11 9 Z" fill="currentColor" />
                  </svg>
                </span>
                <span>02 // LOCATION</span>
              </span>
              <span className="tag" style={{ color: "var(--accent)" }}>PING · 18MS</span>
            </div>
            <LocationLive />
          </div>
        </div>

        {/* INBOX */}
        <div className="card inbox">
          <SparkleCorner variant="star" />
          <div className="card-label">
            <span className="left"><CardGlyph name="feather" /><span>05 // INBOX · CRITICAL</span></span>
            <span className="tag">4 UNREAD</span>
          </div>
          <div className="inbox-list">
            <InboxItem initials="ML" name="Maya Lin" urgent preview="Re: HC v2.7 scope — need your sign-off today" time="12M" />
            <InboxItem initials="TH" name="Theo Harris" preview="Moved our sync · new calendar invite attached" time="48M" />
            <InboxItem initials="EN" name="Eliza N." preview={"Dinner Saturday still on? Booked a table 🍷"} time="2H" />
            <InboxItem initials="AC" name="Anthropic Labs" preview="Claude Design research preview · welcome packet" time="5H" />
          </div>
        </div>

        {/* NOW PLAYING */}
        <div className="card now-playing">
          <SparkleCorner delayed variant="swirl" />
          <div className="card-label">
            <span className="left"><CardGlyph name="music" /><span>06 // NOW PLAYING</span></span>
            <span className="tag">SPOTIFY</span>
          </div>
          <NowPlayingLive />
        </div>

        {/* ACTIVE PROJECT */}
        <div className="card project">
          <SparkleCorner variant="star" />
          <div className="card-label">
            <span className="left"><CardGlyph name="compass" /><span>07 // ACTIVE PROJECT</span></span>
            <span className="tag" style={{ color: "var(--accent-2)" }}>DUE OCT 2</span>
          </div>
          <div className="proj-title">Hero&apos;s Chronicle · <em>v1.0</em></div>
          <div className="proj-sub">PG&apos;S 30TH · LIFE GAMIFICATION APP</div>
          <div className="progress-row"><span>PROGRESS</span><span className="pct">62%</span></div>
          <div className="bar-track" />
          <div className="checklist">
            <div className="check done"><span className="box" />Design system + 5-tab architecture</div>
            <div className="check done"><span className="box" />Supabase + Whoop API wiring</div>
            <div className="check done"><span className="box" />Vercel deploy · PWA</div>
            <div className="check"><span className="box" />iMessage integration · chat.db polling</div>
            <div className="check"><span className="box" />Login + onboarding variant selection</div>
            <div className="check"><span className="box" />Rive avatar wiring to UI</div>
          </div>
        </div>
      </div>
    </>
  );
}

function InboxItem({ initials, name, preview, time, urgent }: {
  initials: string; name: string; preview: string; time: string; urgent?: boolean;
}) {
  return (
    <div className="inbox-item">
      <div className="inbox-av">{initials}</div>
      <div className="inbox-body">
        <div className="row">
          <span className="name">{name}</span>
          {urgent && <span className="badge">URGENT</span>}
        </div>
        <div className="sub">{preview}</div>
      </div>
      <span className="inbox-time">{time}</span>
    </div>
  );
}

function LiveDatestamp() {
  const d = new Date();
  const DOW = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  const MON = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
  return <>{`${DOW[d.getDay()]} · ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · DAY ${dayOfYear} OF 365`}</>;
}
