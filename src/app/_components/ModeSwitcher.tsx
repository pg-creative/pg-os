"use client";
import { useMode, Mode, MODE_LABELS } from "./ModeProvider";

const CHIPS: { key: Mode; label: string }[] = [
  { key: "laputa-day", label: "Day" },
  { key: "laputa-twilight", label: "Twilight" },
  { key: "laputa-midnight", label: "Midnight" },
  { key: "howls", label: "Howl's" },
  { key: "totoro", label: "Totoro" },
  { key: "mononoke", label: "Mononoke" },
];

export function ModeSwitcher() {
  const { mode, autoMode, setMode, setAutoMode } = useMode();
  return (
    <div className="switcher">
      <span className="label">TIME</span>
      <div
        className={`chip auto-toggle${autoMode ? " active" : ""}`}
        onClick={() => setAutoMode(!autoMode)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setAutoMode(!autoMode)}
      >
        AUTO
      </div>
      {CHIPS.map((c) => (
        <div
          key={c.key}
          className={`chip${mode === c.key ? " active" : ""}`}
          onClick={() => setMode(c.key)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setMode(c.key)}
        >
          <span className={`swatch ${c.key}`} />
          {c.label}
        </div>
      ))}
    </div>
  );
}

export function ModeLabel() {
  const { mode } = useMode();
  return <>{MODE_LABELS[mode]}</>;
}

export function AutoBadge() {
  const { autoMode } = useMode();
  return (
    <span id="auto-badge" className={autoMode ? "auto-on" : "auto-off"}>
      {autoMode ? "AUTO" : "MANUAL"}
    </span>
  );
}

export function Greeting() {
  const { greeting } = useMode();
  return <em id="greet-word">{greeting}</em>;
}
