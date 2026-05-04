"use client";
import { ModeSwitcher, ModeLabel, AutoBadge } from "./_components/ModeSwitcher";
import { LiveStamp } from "./_components/LiveClock";
import { CityTemp } from "./_components/LocationLive";
import { HomeModeToggle } from "./_components/HomeModeToggle";
import { AmbientParticles } from "./_components/AmbientParticles";
import { TabBar } from "./_components/TabBar";
import { CaptureFAB } from "./_components/CaptureFAB";
import { BrandModePicker } from "./_components/BrandModePicker";
import { CopilotLauncher } from "./_components/Copilot/CopilotPanel";
import { SoundToggle } from "./_components/SoundProvider";
import { useActiveTab } from "./_components/useActiveTab";
import { useIsCloud } from "./_components/useIsCloud";
import { HomeView } from "./_components/views/HomeView";
import { HabitsView } from "./_components/views/HabitsView";
import { ProjectsView } from "./_components/views/ProjectsView";
import { FlowView } from "./_components/views/FlowView";
import { ClaudeView } from "./_components/views/ClaudeView";
import CommandPalette, { useCommandPaletteHotkey } from "./_components/CommandPalette";

export default function Page() {
  const { active } = useActiveTab();
  const isCloud = useIsCloud();
  useCommandPaletteHotkey();
  return (
    <>
      <AmbientParticles />
      <div className="shell">
        {/* TOP BAR */}
        <div className="topbar">
          <div className="brand">
            <span className="dot" />
            <span>PG OS</span>
            <span className="ver">
              // v0.3 // <ModeLabel /> · <AutoBadge />
              {isCloud === true && <span className="ver-cloud" title="Cloud mode — laptop-only actions are gated. Open 127.0.0.1:3030 from your Mac for full access."> · CLOUD</span>}
              {isCloud === false && <span className="ver-local" title="Local mode — full access including subprocess spawning."> · LOCAL</span>}
            </span>
          </div>
          <div className="telemetry">
            <span><CityTemp /></span>
            <span><LiveStamp /></span>
            <BrandModePicker />
            <HomeModeToggle />
            <SoundToggle />
          </div>
        </div>

        {/* TAB BAR */}
        <TabBar />

        {/* ACTIVE VIEW */}
        {active === "home" && <HomeView />}
        {active === "habits" && <HabitsView />}
        {active === "projects" && <ProjectsView />}
        {active === "flow" && <FlowView />}
        {active === "claude" && <ClaudeView />}

        {/* HUMILITY FOOTER — always visible, per blueprint */}
        <div className="humility-footer">
          The OS can show you. It cannot do it for you.
        </div>
      </div>

      <ModeSwitcher />
      <CaptureFAB />
      <CopilotLauncher />
      <CommandPalette />
    </>
  );
}
