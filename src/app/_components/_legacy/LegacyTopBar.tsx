"use client";

/**
 * ARCHIVED 2026-05-21 for reference. This was the original global top bar +
 * tab strip in page.tsx (the "old stuff" PG asked to remove when the home-lab
 * top bar became the app foundation). Replaced by EmakiShellBar + the legacy
 * TabBar component (kept at ../TabBar.tsx). NOT rendered anywhere.
 *
 * Kept so the functional controls it carried (BrandModePicker, HomeModeToggle,
 * SoundToggle, cloud/local badge, ModeLabel) can be re-added to EmakiShellBar's
 * actions area if PG wants them visible again. Most also have hotkeys.
 */

import { ModeLabel } from "../ModeSwitcher";
import { HomeModeBadge } from "../BridgeModeProvider";
import { LiveStamp } from "../LiveClock";
import { CityTemp } from "../LocationLive";
import { HomeModeToggle } from "../HomeModeToggle";
import { BrandModePicker } from "../BrandModePicker";
import { SoundToggle } from "../SoundProvider";
import { useIsCloud } from "../useIsCloud";
import { TabBar } from "../TabBar";

export function LegacyTopBar() {
  const isCloud = useIsCloud();
  return (
    <>
      <div className="topbar">
        <div className="brand">
          <span className="dot" />
          <span>PG OS</span>
          <span className="ver">
            // v0.3 // <ModeLabel /> · <HomeModeBadge />
            {isCloud === true && (
              <span className="ver-cloud" title="Cloud mode">
                {" "}
                · CLOUD
              </span>
            )}
            {isCloud === false && (
              <span className="ver-local" title="Local mode">
                {" "}
                · LOCAL
              </span>
            )}
          </span>
        </div>
        <div className="telemetry">
          <span>
            <CityTemp />
          </span>
          <span>
            <LiveStamp />
          </span>
          <BrandModePicker />
          <HomeModeToggle />
          <SoundToggle />
        </div>
      </div>
      <TabBar />
    </>
  );
}
