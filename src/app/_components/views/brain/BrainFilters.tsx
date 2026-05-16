"use client";
import type {
  BrainFilterState,
  Route,
  FileType,
  SourceQuality,
} from "@/lib/brain/types";

interface Props {
  filter: BrainFilterState;
  setFilter: (
    patch:
      | Partial<BrainFilterState>
      | ((s: BrainFilterState) => BrainFilterState),
  ) => void;
  allTags: string[];
}

const ROUTES: Route[] = ["second_brain", "queue", "kill"];
const FILE_TYPES: FileType[] = [
  "sources",
  "concepts",
  "playbooks",
  "synthesis",
  "queue",
];
const QUALITIES: SourceQuality[] = ["verified", "unverified", "hype"];

function toggleMember<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export function BrainFilters({ filter, setFilter, allTags }: Props) {
  return (
    <div className="brain-filters">
      <div className="brain-filter-group">
        <div className="brain-filter-label">Route</div>
        <div className="brain-chip-row">
          {ROUTES.map((r) => (
            <button
              key={r}
              type="button"
              className={`brain-chip${filter.routes.includes(r) ? " active" : ""}`}
              onClick={() =>
                setFilter((s) => ({ ...s, routes: toggleMember(s.routes, r) }))
              }
            >
              {r.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="brain-filter-group">
        <div className="brain-filter-label">Type</div>
        <div className="brain-chip-row">
          {FILE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`brain-chip${filter.fileTypes.includes(t) ? " active" : ""}`}
              onClick={() =>
                setFilter((s) => ({
                  ...s,
                  fileTypes: toggleMember(s.fileTypes, t),
                }))
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="brain-filter-group">
        <div className="brain-filter-label">Source quality</div>
        <div className="brain-chip-row">
          {QUALITIES.map((q) => (
            <button
              key={q}
              type="button"
              className={`brain-chip brain-chip-quality-${q}${
                filter.sourceQualities.includes(q) ? " active" : ""
              }`}
              onClick={() =>
                setFilter((s) => ({
                  ...s,
                  sourceQualities: toggleMember(s.sourceQualities, q),
                }))
              }
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="brain-filter-group">
        <label className="brain-toggle">
          <input
            type="checkbox"
            checked={filter.seedlingOnly}
            onChange={(e) => setFilter({ seedlingOnly: e.target.checked })}
          />
          <span>Seedlings only (PG intent)</span>
        </label>
      </div>

      <div className="brain-filter-group">
        <div className="brain-filter-label">Sort</div>
        <select
          className="brain-sort"
          value={filter.sortBy}
          onChange={(e) =>
            setFilter({ sortBy: e.target.value as BrainFilterState["sortBy"] })
          }
        >
          <option value="score-desc">Score ↓</option>
          <option value="score-asc">Score ↑</option>
          <option value="date-desc">Newest</option>
          <option value="date-asc">Oldest</option>
          <option value="title">Title A→Z</option>
        </select>
      </div>

      <div className="brain-filter-group">
        <div className="brain-filter-label">
          Tags <span className="brain-filter-count">({allTags.length})</span>
        </div>
        <div className="brain-tag-list">
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              className={`brain-tag-chip-clickable${
                filter.tags.includes(t) ? " active" : ""
              }`}
              onClick={() =>
                setFilter((s) => ({ ...s, tags: toggleMember(s.tags, t) }))
              }
            >
              #{t}
            </button>
          ))}
        </div>
      </div>

      {(filter.routes.length ||
        filter.fileTypes.length ||
        filter.tags.length ||
        filter.sourceQualities.length ||
        filter.seedlingOnly ||
        filter.query) && (
        <button
          type="button"
          className="brain-filter-reset"
          onClick={() =>
            setFilter({
              routes: [],
              fileTypes: [],
              tags: [],
              sourceQualities: [],
              seedlingOnly: false,
              query: "",
              sortBy: filter.sortBy,
            })
          }
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
