"use client";
import { ModeLabel } from "./_components/ModeSwitcher";
import {
  BridgeModeProvider,
  HomeModeBadge,
} from "./_components/BridgeModeProvider";
import { ToastDeck } from "./_components/Toast";
import { LiveStamp } from "./_components/LiveClock";
import { CityTemp } from "./_components/LocationLive";
import { HomeModeToggle } from "./_components/HomeModeToggle";
import { AmbientParticles } from "./_components/AmbientParticles";
import { TabBar } from "./_components/TabBar";
import { EmakiBackdrop } from "./_components/emaki/EmakiBackdrop";
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
import { CockpitView } from "./_components/views/CockpitView";
import { StackView } from "./_components/views/StackView";
import { TimelineView } from "./_components/views/TimelineView";
import { BrainView } from "./_components/views/BrainView";
import SeasonMeter from "./_components/SeasonMeter";
import { NowProvider } from "./_components/NowProvider";
import { AmbientIdle } from "./_components/AmbientIdle";
import CommandPalette, {
  useCommandPaletteHotkey,
} from "./_components/CommandPalette";

export default function Page() {
  const { active } = useActiveTab();
  const isCloud = useIsCloud();
  useCommandPaletteHotkey();
  return (
    <BridgeModeProvider>
      <NowProvider>
        <EmakiBackdrop />
        <AmbientParticles />
        <div className="shell">
          {/* TOP BAR */}
          <div className="topbar">
            <div className="brand">
              <span className="dot" />
              <span>PG OS</span>
              <span className="ver">
                // v0.3 // <ModeLabel /> · <HomeModeBadge />
                {isCloud === true && (
                  <span
                    className="ver-cloud"
                    title="Cloud mode — laptop-only actions are gated. Open 127.0.0.1:3030 from your Mac for full access."
                  >
                    {" "}
                    · CLOUD
                  </span>
                )}
                {isCloud === false && (
                  <span
                    className="ver-local"
                    title="Local mode — full access including subprocess spawning."
                  >
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

          {/* TAB BAR */}
          <TabBar />

          {/* ACTIVE VIEW */}
          {active === "home" && (
            <>
              <SeasonMeter />
              <HomeView />
            </>
          )}
          {active === "habits" && <HabitsView />}
          {active === "projects" && <ProjectsView />}
          {active === "flow" && <FlowView />}
          {active === "timeline" && <TimelineView />}
          {active === "claude" && <ClaudeView />}
          {active === "cockpit" && <CockpitView />}
          {active === "stack" && <StackView />}
          {active === "brain" && <BrainView />}

          {/* HUMILITY FOOTER — always visible, per blueprint */}
          <div className="humility-footer">
            The OS can show you. It cannot do it for you.
          </div>
        </div>

        {/* On the cockpit, Marvis is the voice/assistant — hide the global FABs so they don't cover him */}
        {active !== "cockpit" && <CaptureFAB />}
        {active !== "cockpit" && <CopilotLauncher />}
        <CommandPalette />
        <AmbientIdle />
        <ToastDeck />
      </NowProvider>
    </BridgeModeProvider>
  );
}
