// Brain library types — mirrors frontmatter shape of brain/wiki/*.md entries
// Authored 2026-05-15 for Brain tab in Personal OS

export type Route = "second_brain" | "queue" | "kill";
export type FilterVerdict = "hard_pass" | "soft_pass" | "hard_fail";
export type SourceQuality = "verified" | "unverified" | "hype";
export type Classification = "reference" | "candidate";
export type EntryStatus = "active" | "superseded" | "archived";
export type FileType =
  | "sources"
  | "concepts"
  | "playbooks"
  | "synthesis"
  | "queue";
export type SourceType =
  | "tweet"
  | "article"
  | "post"
  | "podcast"
  | "repo"
  | "idea"
  | "screenshot"
  | "youtube";

export interface BrainEntryFrontmatter {
  date: string; // YYYY-MM-DD
  source_url?: string;
  source_type?: SourceType;
  filter?: FilterVerdict;
  classification?: Classification;
  score?: number; // 1-20
  route: Route | "kill";
  route_path?: string;
  tags?: string[];
  status?: EntryStatus;
  last_touched?: string; // YYYY-MM-DD
  source_quality?: SourceQuality;
  kill_reason?: string;
}

export interface BrainEntry {
  slug: string; // filename without .md
  fileType: FileType; // derived from path
  path: string; // absolute fs path
  relativePath: string; // wiki/<type>/<slug>.md
  title: string; // first H1 of body
  frontmatter: BrainEntryFrontmatter;
  body: string; // markdown body, frontmatter stripped
  modifiedAt: number; // unix ms
}

export interface BrainStats {
  total: number;
  byRoute: Record<Route, number>;
  byFileType: Record<FileType, number>;
  bySourceQuality: Record<SourceQuality, number>;
  seedlingCount: number;
  queueCount: number;
  averageScore: number;
}

export interface BrainFilterState {
  routes: Route[];
  fileTypes: FileType[];
  tags: string[]; // any-match (OR)
  sourceQualities: SourceQuality[];
  seedlingOnly: boolean;
  query: string; // substring search across title + tags
  sortBy: "score-desc" | "score-asc" | "date-desc" | "date-asc" | "title";
}

export const DEFAULT_FILTER_STATE: BrainFilterState = {
  routes: [],
  fileTypes: [],
  tags: [],
  sourceQualities: [],
  seedlingOnly: false,
  query: "",
  sortBy: "score-desc",
};
