"use client";
/**
 * UX VARIANT — SPATIAL MAP
 * Pan/zoom 2D canvas. Entries as nodes positioned by tag cluster.
 * - Size proportional to score
 * - Color by route (second_brain / queue / kill)
 * - Edges drawn between nodes that share 2+ tags (top-N to avoid spaghetti)
 * - Pan: drag empty canvas. Zoom: wheel. Click node → drawer.
 * - Minimap in bottom-right shows viewport position.
 *
 * Implementation: SVG-based, no external graph library. Layout: radial
 * cluster — each tag gets a position on a ring, entries gravitate to their
 * primary tag's position with jitter so same-tag entries cluster visibly.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useBrainEntries } from "../../../_components/views/brain/useBrainEntries";
import { useBrainMutations } from "../shared/Mutations";
import type { BrainEntry } from "@/lib/brain/types";

const WORLD_W = 2400;
const WORLD_H = 1600;

type Node = {
  slug: string;
  x: number;
  y: number;
  r: number;
  entry: BrainEntry;
  primaryTag: string;
};

type Edge = { a: string; b: string; weight: number };

// Stable hash → pseudo-random number in [0, 1)
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(Math.sin(h)) % 1;
}

export function SpatialMapVariant() {
  const { entries, loading, refresh } = useBrainEntries();
  const { busySlug, throwIt, defer, archive } = useBrainMutations(refresh);
  const [selected, setSelected] = useState<BrainEntry | null>(null);
  const [scale, setScale] = useState(0.7);
  const [pan, setPan] = useState({ x: 200, y: 100 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const panStart = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [filter, setFilter] = useState("");

  // Compute tag → ring position. Top 12 tags get nodes on a circle.
  const { nodes, edges, tagRing } = useMemo(() => {
    const tagCount = new Map<string, number>();
    for (const e of entries) {
      for (const t of e.frontmatter.tags ?? []) {
        tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
      }
    }
    const tags = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([t]) => t);
    const cx = WORLD_W / 2;
    const cy = WORLD_H / 2;
    const ringRadius = 540;
    const tagRing: Record<string, { x: number; y: number }> = {};
    tags.forEach((t, i) => {
      const angle = (i / tags.length) * Math.PI * 2 - Math.PI / 2;
      tagRing[t] = {
        x: cx + Math.cos(angle) * ringRadius,
        y: cy + Math.sin(angle) * ringRadius,
      };
    });

    const nodes: Node[] = entries.map((e) => {
      const score = e.frontmatter.score ?? 0;
      const r = Math.max(10, Math.min(34, 10 + score * 1.4));
      const tagsHit = (e.frontmatter.tags ?? []).filter((t) => tagRing[t]);
      const primaryTag = tagsHit[0] ?? "_floating";
      const anchor = tagRing[primaryTag] ?? { x: cx, y: cy };
      // Jitter around anchor — stable per slug
      const jx = (hash(e.slug + "x") - 0.5) * 220;
      const jy = (hash(e.slug + "y") - 0.5) * 220;
      return {
        slug: e.slug,
        entry: e,
        x: anchor.x + jx,
        y: anchor.y + jy,
        r,
        primaryTag,
      };
    });

    // Edges — nodes sharing ≥2 tags
    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = new Set(nodes[i].entry.frontmatter.tags ?? []);
        const b = new Set(nodes[j].entry.frontmatter.tags ?? []);
        let shared = 0;
        for (const t of a) if (b.has(t)) shared++;
        if (shared >= 2)
          edges.push({ a: nodes[i].slug, b: nodes[j].slug, weight: shared });
      }
    }
    // Keep top 60 edges
    edges.sort((x, y) => y.weight - x.weight);
    return { nodes, edges: edges.slice(0, 60), tagRing };
  }, [entries]);

  const filteredSlugs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return null;
    const hits = new Set<string>();
    for (const n of nodes) {
      if (
        n.entry.title.toLowerCase().includes(q) ||
        (n.entry.frontmatter.tags ?? []).some((t) =>
          t.toLowerCase().includes(q),
        )
      )
        hits.add(n.slug);
    }
    return hits;
  }, [filter, nodes]);

  // Pan + zoom handlers
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    });
  };
  const onPointerUp = () => {
    setDragging(false);
    dragStart.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setScale((s) => Math.max(0.25, Math.min(1.8, s + delta)));
  };

  const routeFill = (route: string | undefined, tier: string) => {
    if (route === "queue") return "#b8770d";
    if (route === "kill") return "#9a958c";
    if (tier === "high") return "#7a1830";
    if (tier === "mid") return "#1e40af";
    return "#2a5a7a";
  };

  const flyToSearch = () => {
    if (!filteredSlugs || filteredSlugs.size === 0) return;
    const first = nodes.find((n) => filteredSlugs.has(n.slug));
    if (!first) return;
    // Center the viewport on first hit
    const vw = svgRef.current?.clientWidth ?? 1200;
    const vh = svgRef.current?.clientHeight ?? 720;
    setPan({
      x: vw / 2 - first.x * scale,
      y: vh / 2 - first.y * scale,
    });
  };

  return (
    <div className="ux-map">
      {/* Toolbar */}
      <header className="ux-map-toolbar">
        <input
          type="search"
          className="ux-map-search"
          placeholder="find on the map…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") flyToSearch();
          }}
        />
        <div className="ux-map-meta">
          {nodes.length} nodes · {edges.length} edges ·{" "}
          {Math.round(scale * 100)}%
        </div>
        <div className="ux-map-controls">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.25, s - 0.15))}
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(1.8, s + 0.15))}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              setScale(0.7);
              setPan({ x: 200, y: 100 });
            }}
          >
            reset
          </button>
        </div>
      </header>

      <div
        className={`ux-map-canvas${dragging ? " dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <svg
          ref={svgRef}
          className="ux-map-svg"
          width="100%"
          height="100%"
          viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
          preserveAspectRatio="xMidYMid slice"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Tag ring labels */}
          {Object.entries(tagRing).map(([tag, p]) => (
            <text
              key={tag}
              x={p.x}
              y={p.y - 36}
              className="ux-map-tag-label"
              textAnchor="middle"
            >
              #{tag}
            </text>
          ))}
          {/* Edges */}
          {edges.map((e) => {
            const a = nodes.find((n) => n.slug === e.a);
            const b = nodes.find((n) => n.slug === e.b);
            if (!a || !b) return null;
            return (
              <line
                key={`${e.a}-${e.b}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="rgba(26,24,21,0.10)"
                strokeWidth={Math.max(0.6, e.weight * 0.6)}
              />
            );
          })}
          {/* Nodes */}
          {nodes.map((n) => {
            const score = n.entry.frontmatter.score ?? 0;
            const tier = score >= 14 ? "high" : score >= 10 ? "mid" : "low";
            const route = n.entry.frontmatter.route as string | undefined;
            const dim = filteredSlugs && !filteredSlugs.has(n.slug) ? 0.18 : 1;
            return (
              <g
                key={n.slug}
                data-node
                className="ux-map-node"
                style={{ opacity: dim }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(n.entry);
                }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={routeFill(route, tier)}
                  fillOpacity={0.85}
                  stroke="#1a1815"
                  strokeWidth={1.4}
                />
                <text
                  x={n.x}
                  y={n.y + 4}
                  textAnchor="middle"
                  className="ux-map-node-num"
                >
                  {score || ""}
                </text>
                <text
                  x={n.x}
                  y={n.y + n.r + 18}
                  textAnchor="middle"
                  className="ux-map-node-label"
                >
                  {n.entry.title.slice(0, 28)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Mini-map */}
        <div className="ux-map-mini">
          <svg
            viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {edges.slice(0, 30).map((e) => {
              const a = nodes.find((n) => n.slug === e.a);
              const b = nodes.find((n) => n.slug === e.b);
              if (!a || !b) return null;
              return (
                <line
                  key={`m-${e.a}-${e.b}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="rgba(26,24,21,0.15)"
                  strokeWidth={2}
                />
              );
            })}
            {nodes.map((n) => (
              <circle
                key={`m-${n.slug}`}
                cx={n.x}
                cy={n.y}
                r={12}
                fill="#1e40af"
              />
            ))}
            {/* Viewport box */}
            <rect
              x={-pan.x / scale}
              y={-pan.y / scale}
              width={(svgRef.current?.clientWidth ?? 1200) / scale}
              height={(svgRef.current?.clientHeight ?? 720) / scale}
              fill="none"
              stroke="#b8770d"
              strokeWidth={6}
            />
          </svg>
        </div>

        {/* Legend */}
        <div className="ux-map-legend">
          <div>
            <span className="ux-map-swatch" style={{ background: "#7a1830" }} />
            tier high (≥14)
          </div>
          <div>
            <span className="ux-map-swatch" style={{ background: "#1e40af" }} />
            tier mid (10–13)
          </div>
          <div>
            <span className="ux-map-swatch" style={{ background: "#b8770d" }} />
            queue
          </div>
          <div>
            <span className="ux-map-swatch" style={{ background: "#9a958c" }} />
            kill
          </div>
        </div>
      </div>

      {/* Node detail drawer */}
      {selected && (
        <div
          className="ux-map-drawer-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <aside className="ux-map-drawer">
            <button
              type="button"
              className="ux-map-drawer-close"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <h2>{selected.title}</h2>
            <div className="ux-map-drawer-meta">
              <span>score: {selected.frontmatter.score ?? "—"}/20</span>
              <span>type: {selected.fileType}</span>
              <span>route: {selected.frontmatter.route ?? "second_brain"}</span>
            </div>
            <div className="ux-map-drawer-tags">
              {(selected.frontmatter.tags ?? []).map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
            <div className="ux-map-drawer-actions">
              <button
                type="button"
                disabled={busySlug === selected.slug}
                onClick={() => throwIt(selected.slug)}
              >
                throw
              </button>
              <button
                type="button"
                disabled={busySlug === selected.slug}
                onClick={() => defer(selected.slug)}
              >
                defer
              </button>
              <button
                type="button"
                disabled={busySlug === selected.slug}
                onClick={() => archive(selected.slug)}
              >
                archive
              </button>
              {selected.frontmatter.source_url && (
                <a
                  href={selected.frontmatter.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  source ↗
                </a>
              )}
            </div>
            <pre className="ux-map-drawer-body">{selected.body}</pre>
          </aside>
        </div>
      )}
    </div>
  );
}
