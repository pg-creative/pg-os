"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSound } from "./SoundProvider";
import { score } from "../../lib/fuzzySearch";
import { useCommands, type Command } from "../../lib/commands";

// ── Context ───────────────────────────────────────────────────────────────────

type PaletteCtx = { open: boolean; setOpen: (v: boolean) => void };
const PaletteContext = createContext<PaletteCtx | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <PaletteContext.Provider value={{ open, setOpen }}>
      {children}
    </PaletteContext.Provider>
  );
}

function usePaletteContext(): PaletteCtx {
  const ctx = useContext(PaletteContext);
  // Fallback: module-level open state driven by custom event
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (ctx) return; // real context, don't set up event listener
    const toggle = () => setOpen((o) => !o);
    window.addEventListener("pgos:cmd-toggle", toggle);
    return () => window.removeEventListener("pgos:cmd-toggle", toggle);
  }, [ctx]);
  if (ctx) return ctx;
  return { open, setOpen };
}

// ── Hotkey hook (exported) ────────────────────────────────────────────────────

export function useCommandPaletteHotkey() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "k"
      ) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("pgos:cmd-toggle"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

// ── Recent storage ────────────────────────────────────────────────────────────

const RECENT_KEY = "pg-os-cmd-recent";
const RECENT_CAP = 8;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as string[]).slice(0, RECENT_CAP)
      : [];
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  try {
    const list = readRecent().filter((x) => x !== id);
    list.unshift(id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_CAP)));
  } catch {
    /* quota */
  }
}

// ── Scoring + grouping ────────────────────────────────────────────────────────

type ScoredCommand = Command & { _score: number };

function scoreCommands(query: string, commands: Command[]): ScoredCommand[] {
  return commands
    .map((c) => {
      const labelScore = score(query, c.label) * 0.5;
      const groupScore = score(query, c.group) * 0.2;
      const keywordScore = score(query, (c.keywords ?? []).join(" ")) * 0.3;
      return { ...c, _score: labelScore + groupScore + keywordScore };
    })
    .filter((c) => c._score > 0.05)
    .sort((a, b) => b._score - a._score)
    .slice(0, 24);
}

function groupBy<T extends { group: string }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    if (!map.has(item.group)) map.set(item.group, []);
    map.get(item.group)!.push(item);
  }
  return Array.from(map.entries());
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const { open, setOpen } = usePaletteContext();
  const { play } = useSound();
  const commands = useCommands();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const returnFocusRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute results list
  const results: ScoredCommand[] = query.trim()
    ? scoreCommands(query, commands)
    : (() => {
        const recent = readRecent();
        const resolved = recent
          .map((id) => commands.find((c) => c.id === id))
          .filter((c): c is Command => !!c)
          .map((c) => ({ ...c, _score: 1 }));
        return resolved;
      })();

  // Flat list for keyboard navigation
  const flat = results;

  // Open/close effects
  useEffect(() => {
    if (open) {
      play("modalOpen");
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setSelectedIndex(0);
      // focus input on next frame after render
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      returnFocusRef.current?.focus?.();
    }
  }, [open]);

  // Keyboard: Escape, arrows, Enter, Tab trap
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flat.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = flat[selectedIndex];
        if (cmd) runCommand(cmd);
        return;
      }
      // Focus trap
      if (e.key === "Tab") {
        const root = panelRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'input:not([disabled]), [role="option"][tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flat, selectedIndex, setOpen]);

  const runCommand = useCallback(
    (cmd: Command) => {
      pushRecent(cmd.id);
      setOpen(false);
      cmd.run();
    },
    [setOpen],
  );

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  const groups = query.trim()
    ? groupBy(results)
    : results.length > 0
      ? [["Recent", results] as [string, ScoredCommand[]]]
      : [];

  // Compute absolute index for each item across groups (for aria-selected)
  let cursor = 0;

  return (
    <div
      className="cmd-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmd-title"
        className="cmd-panel"
      >
        <h2 id="cmd-title" className="sr-only">
          Command palette
        </h2>

        <input
          ref={inputRef}
          type="text"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />

        <ul className="cmd-list" role="listbox">
          {groups.length === 0 && (
            <li className="cmd-empty">No commands found</li>
          )}
          {groups.map(([groupName, items]) => (
            <li key={groupName}>
              <div className="cmd-group-header" aria-hidden="true">
                {groupName}
              </div>
              <ul role="group">
                {items.map((cmd) => {
                  const idx = cursor++;
                  const selected = idx === selectedIndex;
                  return (
                    <li
                      key={cmd.id}
                      role="option"
                      aria-selected={selected}
                      className="cmd-option"
                      tabIndex={selected ? 0 : -1}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => runCommand(cmd)}
                    >
                      <span className="cmd-option-label">{cmd.label}</span>
                      {cmd.hint && (
                        <span className="cmd-option-hint">{cmd.hint}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
