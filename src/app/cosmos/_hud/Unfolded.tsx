"use client";

/**
 * The unfolded page: a sheet of cream paper in the world's register, with the
 * page's OWN painting above its words.
 *
 * The Critic's deductions 5 and 6, both closed here:
 *
 *   5. Round one printed the page's citations as prose, because the vault's
 *      bodies carried them inline. The keeper strips them into `source:`; this
 *      panel renders that as one small line under the words and never as a
 *      paragraph. If a body still arrives with a citation in it, that is a vault
 *      bug and it shows up in the vault, not dressed as PG's writing.
 *
 *   6. Round one drew a shader rectangle and never touched `plate`. Here the
 *      plate is the first thing in the panel, served through the asset route with
 *      its inline LQIP underneath it so there is a picture from the first frame.
 *
 * The words themselves never travel as data. The server component renders each
 * body into React nodes; this file only decides which one is visible.
 */

import { useEffect, useRef, type ReactNode } from "react";
import type { SceneObject } from "../_scene/contract";

export function Unfolded({
  object,
  body,
  source,
  register,
  onClose,
}: {
  object: SceneObject | null;
  body: ReactNode;
  /** The page's `source:` line, if it has one. A citation, not a paragraph. */
  source: string | null;
  register: string;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  // Escape closes. The world stays exactly where it was: he is still standing
  // in front of the thing, and closing a page is not walking away from it.
  useEffect(() => {
    if (!object) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [object, onClose]);

  return (
    <div
      ref={panel}
      className="cosmos-page"
      data-open={object ? "true" : "false"}
      data-register={register}
      role="dialog"
      aria-modal="false"
      aria-hidden={object ? undefined : true}
      aria-label={object?.title}
    >
      {object && (
        <>
          <button
            type="button"
            className="cosmos-page-close"
            onClick={onClose}
            aria-label="Close, or press Escape"
          >
            ✕
          </button>

          {object.plate && (
            <div className="cosmos-page-plate">
              {object.plate.lqip && (
                <img className="cosmos-page-lqip" src={object.plate.lqip} alt="" aria-hidden />
              )}
              <img className="cosmos-page-full" src={object.plate.url} alt="" />
            </div>
          )}

          <p className="cosmos-page-eyebrow">
            {object.type}
            {(object as SceneObject & { draft?: boolean }).draft && (
              <span className="cosmos-page-draft">draft</span>
            )}
          </p>
          <h2 className="cosmos-page-title">{object.title}</h2>
          <div className="cosmos-page-body">{body}</div>
          {source && <p className="cosmos-page-source">{source}</p>}
        </>
      )}
    </div>
  );
}
