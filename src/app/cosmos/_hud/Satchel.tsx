"use client";

/**
 * The satchel: what he has unfolded, in the spirit of the JRPG inventory plate
 * on the wall (parchment, a gold rule, a grid of small framed things).
 *
 * It is NOT a completion tracker. There is no "3 of 11", no empty slots implying
 * the rest are owed, no percentage. An empty satchel says one line about a road
 * not walked yet, and a full one is just a shelf. "Bad nights render as weather,
 * never as a report card."
 *
 * `build-game-inventory`'s one rule that matters here: one typed source of truth.
 * The satchel never holds its own copy of a page. It holds ids, and every id is
 * a page in the vault; what it shows about a page comes from the manifest.
 */

import type { SceneObject } from "../_scene/contract";

export function Satchel({
  open,
  items,
  onPick,
  onClose,
}: {
  open: boolean;
  items: SceneObject[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="cosmos-satchel"
      data-open={open ? "true" : "false"}
      role="dialog"
      aria-modal="false"
      aria-label="The satchel"
      aria-hidden={!open}
    >
      <div className="cosmos-satchel-head">
        <p className="cosmos-satchel-title">The satchel</p>
        <button
          type="button"
          className="cosmos-satchel-close"
          onClick={onClose}
          aria-label="Close the satchel"
        >
          ✕
        </button>
      </div>

      {items.length === 0 ? (
        <p className="cosmos-satchel-empty">
          Nothing yet. Stand in front of a thing until it opens.
        </p>
      ) : (
        <ul className="cosmos-satchel-grid">
          {items.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="cosmos-satchel-slot"
                onClick={() => onPick(o.id)}
                title={o.title}
              >
                <span className="cosmos-satchel-frame">
                  {o.plate?.url ? (
                    <img src={o.plate.url} alt="" />
                  ) : (
                    <span className="cosmos-satchel-mark" aria-hidden>
                      {glyphFor(o.type)}
                    </span>
                  )}
                </span>
                <span className="cosmos-satchel-name">{o.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One mark per kind of page. A shape, never a count. */
function glyphFor(type: string): string {
  switch (type) {
    case "chapter":
      return "❦";
    case "creed":
      return "✦";
    case "place":
      return "⌂";
    case "object":
      return "◈";
    case "figure":
      return "☙";
    default:
      return "·";
  }
}

export function SatchelButton({
  count,
  onClick,
}: {
  /** Used only to decide whether the strap looks full. Never rendered. */
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="cosmos-chip"
      data-full={count > 0 ? "true" : "false"}
      onClick={onClick}
      aria-label="Open the satchel"
    >
      <span aria-hidden>◫</span>
      <span>satchel</span>
    </button>
  );
}
