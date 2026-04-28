import { db, isDbConfigured, T } from "./db";

export type AgentRun = {
  id: number;
  agent: string;
  source: string;
  pid?: number | null;
  started_at: string;
  finished_at?: string | null;
  status?: string | null;
  cost_usd?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read?: number | null;
  cache_create?: number | null;
  log_excerpt?: string | null;
  summary?: string | null;
  body_md?: string | null;
  notion_url?: string | null;
  model?: string | null;
  brief_date?: string | null;
};

export type AgentRunInput = {
  agent: string;
  source?: string;
  pid?: number;
  started_at?: string;
  finished_at?: string;
  status?: string;
  cost_usd?: number;
  summary?: string;
  body_md?: string;
  notion_url?: string;
  model?: string;
  brief_date?: string;
  log_excerpt?: string;
};

export async function recordAgentRun(input: AgentRunInput): Promise<AgentRun | null> {
  if (!isDbConfigured()) return null;
  const row = {
    agent: input.agent,
    source: input.source ?? "launchd-cron",
    pid: input.pid ?? null,
    started_at: input.started_at ?? new Date().toISOString(),
    finished_at: input.finished_at ?? new Date().toISOString(),
    status: input.status ?? "ok",
    cost_usd: input.cost_usd ?? null,
    summary: input.summary ?? null,
    body_md: input.body_md ?? null,
    notion_url: input.notion_url ?? null,
    model: input.model ?? null,
    brief_date: input.brief_date ?? null,
    log_excerpt: input.log_excerpt ?? null,
  };
  try {
    const { data, error } = await db()
      .from(T.agent_runs)
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data as AgentRun;
  } catch (e) {
    console.error("recordAgentRun failed:", e);
    return null;
  }
}

export async function listAgentRuns(opts: {
  days?: number;
  limit?: number;
  agent?: string;
} = {}): Promise<AgentRun[]> {
  if (!isDbConfigured()) return [];
  const days = opts.days ?? 7;
  const limit = opts.limit ?? 100;
  const since = new Date();
  since.setDate(since.getDate() - days);
  try {
    let q = db()
      .from(T.agent_runs)
      .select("*")
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false })
      .limit(limit);
    if (opts.agent) q = q.eq("agent", opts.agent);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as AgentRun[];
  } catch (e) {
    console.error("listAgentRuns failed:", e);
    return [];
  }
}

export async function getAgentRun(id: number): Promise<AgentRun | null> {
  if (!isDbConfigured()) return null;
  try {
    const { data, error } = await db()
      .from(T.agent_runs)
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as AgentRun;
  } catch (e) {
    console.error("getAgentRun failed:", e);
    return null;
  }
}

// ── telegram_events ──
export type TelegramEvent = {
  id: number;
  direction: "in" | "out";
  kind: string;
  ref_kind?: string | null;
  ref_id?: string | null;
  chat_id?: string | null;
  message_id?: number | null;
  payload?: unknown;
  created_at: string;
};

export type TelegramEventInput = {
  direction: "in" | "out";
  kind: string;
  ref_kind?: string;
  ref_id?: string;
  chat_id?: string | number;
  message_id?: number;
  payload?: unknown;
};

export async function recordTelegramEvent(input: TelegramEventInput): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await db()
      .from(T.telegram_events)
      .insert({
        direction: input.direction,
        kind: input.kind,
        ref_kind: input.ref_kind ?? null,
        ref_id: input.ref_id ?? null,
        chat_id: input.chat_id != null ? String(input.chat_id) : null,
        message_id: input.message_id ?? null,
        payload: input.payload ?? null,
      });
  } catch (e) {
    console.error("recordTelegramEvent failed:", e);
  }
}

export async function listTelegramEventsForRef(
  ref_kind: string,
  ref_id: string,
): Promise<TelegramEvent[]> {
  if (!isDbConfigured()) return [];
  try {
    const { data, error } = await db()
      .from(T.telegram_events)
      .select("*")
      .eq("ref_kind", ref_kind)
      .eq("ref_id", ref_id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as TelegramEvent[];
  } catch (e) {
    console.error("listTelegramEventsForRef failed:", e);
    return [];
  }
}
