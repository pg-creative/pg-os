"use client";
import { BridgeModeProvider } from "./_components/BridgeModeProvider";
import { ToastDeck } from "./_components/Toast";
import { AmbientParticles } from "./_components/AmbientParticles";
import { EmakiShellBar } from "./_components/EmakiShellBar";
import { TabBar } from "./_components/TabBar";
import { EmakiBackdrop } from "./_components/emaki/EmakiBackdrop";
import { MarvisCorner } from "./_components/views/cockpit/MarvisCorner";
import { CaptureFAB } from "./_components/CaptureFAB";
import { CopilotLauncher } from "./_components/Copilot/CopilotPanel";
import { useActiveTab } from "./_components/useActiveTab";
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
  useCommandPaletteHotkey();
  return (
    <BridgeModeProvider>
      <NowProvider>
        <EmakiBackdrop />
        <AmbientParticles />
        {/* Global shell nav — the home-lab top bar. Tabs are hidden on mobile
            via EmakiShellBar's @media (max-width: 767px) rule; the bottom
            TabBar takes over for thumb-friendly mobile navigation. */}
        <EmakiShellBar />
        <div className={`shell${active === "home" ? " shell-bleed" : ""}`}>
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

        {/* Kitsu (MarvisCorner) is a GLOBAL persistent presence, bottom-right on every tab. */}
        <MarvisCorner modelUrl="/live2d/fox/standard_fox.model3.json" />
        {/* On the cockpit, the global FABs are hidden so they don't crowd Kitsu's terminal. */}
        {active !== "cockpit" && <CaptureFAB />}
        {active !== "cockpit" && <CopilotLauncher />}
        {/* Mobile bottom thumb bar -- position:fixed via globals.css @media (max-width:768px).
            Hidden on desktop by the same media query (display:none above 768px). */}
        <TabBar />
        <CommandPalette />
        <AmbientIdle />
        <ToastDeck />
      </NowProvider>
    </BridgeModeProvider>
  );
}
