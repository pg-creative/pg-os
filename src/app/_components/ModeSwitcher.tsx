"use client";
import { useMode, MODE_LABELS } from "./ModeProvider";

export function ModeLabel() {
  const { mode } = useMode();
  return <>{MODE_LABELS[mode]}</>;
}

export function Greeting() {
  const { greeting } = useMode();
  return <em id="greet-word">{greeting}</em>;
}
