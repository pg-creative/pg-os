"use client";
import { useCallback, useEffect, useState } from "react";
import { useSound } from "./SoundProvider";

const KEY = "pg-os-home-mode";

function readStored(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function HomeModeToggle() {
  const [on, setOn] = useState(false);
  const { play } = useSound();

  useEffect(() => {
    const initial = readStored();
    setOn(initial);
    document.documentElement.dataset.homeMode = initial ? "true" : "false";
  }, []);

  const toggle = useCallback(() => {
    play("confirm");
    setOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* quota */
      }
      document.documentElement.dataset.homeMode = next ? "true" : "false";
      return next;
    });
  }, [play]);

  return (
    <button
      className={`home-mode-toggle${on ? " on" : ""}`}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Exit home mode" : "Enter home mode"}
      title={on ? "Exit home mode" : "Enter home mode"}
    >
      <span className="hm-glyph" aria-hidden>
        {on ? "🏠" : "🏠"}
      </span>
      <span className="hm-label">{on ? "HOME · ON" : "HOME"}</span>
    </button>
  );
}
