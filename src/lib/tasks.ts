import { db, isDbConfigured } from "./db";

export type TaskStatus = "todo" | "doing" | "done" | "archived";
export type TaskPriority = "low" | "med" | "high";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  due_at: string | null;       // ISO string or null
  completed_at: string | null; // ISO string or null
  created_at: string;
  updated_at: string;
  source: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  project_id?: string | null;
  priority?: TaskPriority | null;
  due_at?: string | null;
  source?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  project_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority | null;
  due_at?: string | null;
  source?: string;
}

function requireDb() {
  if (!isDbConfigured()) {
    throw new Error(
      "Tasks require PGOS_SUPABASE_URL + PGOS_SUPABASE_SERVICE_ROLE_KEY. " +
      "Set them in .env.local — see supabase/README.md.",
    );
  }
  return db();
}

export async function listTasks(opts?: {
  project_id?: string | null;
  status?: TaskStatus | null;
}): Promise<Task[]> {
  const client = requireDb();
  let q = client
    .from("tasks")
    .select("id,title,description,project_id,status,priority,due_at,completed_at,created_at,updated_at,source")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (opts?.project_id) {
    q = q.eq("project_id", opts.project_id);
  }
  if (opts?.status) {
    q = q.eq("status", opts.status);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function listArchivedTasks(opts?: {
  project_id?: string | null;
}): Promise<Task[]> {
  const client = requireDb();
  let q = client
    .from("tasks")
    .select("id,title,description,project_id,status,priority,due_at,completed_at,created_at,updated_at,source")
    .eq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (opts?.project_id) {
    q = q.eq("project_id", opts.project_id);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const client = requireDb();
  const row = {
    title: input.title.trim(),
    description: input.description ?? null,
    project_id: input.project_id ?? null,
    priority: input.priority ?? null,
    due_at: input.due_at ?? null,
    source: input.source ?? null,
    status: "todo" as const,
  };
  const { data, error } = await client
    .from("tasks")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const client = requireDb();
  const patch: Record<string, unknown> = { ...input };

  // Auto-set completed_at when marking done
  if (input.status === "done") {
    patch.completed_at = new Date().toISOString();
  }
  // Clear completed_at when un-doing
  if (input.status && input.status !== "done") {
    patch.completed_at = null;
  }

  const { data, error } = await client
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  // Soft delete — set status to 'archived'
  const client = requireDb();
  const { error } = await client
    .from("tasks")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function getTask(id: string): Promise<Task | null> {
  const client = requireDb();
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }
  return data as Task;
}
