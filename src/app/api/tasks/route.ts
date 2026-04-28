import { NextRequest, NextResponse } from "next/server";
import {
  listTasks,
  listArchivedTasks,
  createTask,
  TaskStatus,
} from "@/lib/tasks";

// GET /api/tasks?project=&status=
export async function GET(req: NextRequest) {
  try {
    const project = req.nextUrl.searchParams.get("project") || null;
    const rawStatus = req.nextUrl.searchParams.get("status"); // 'todo'|'doing'|'done'|'archived'|'all'|null

    if (rawStatus === "archived") {
      const tasks = await listArchivedTasks({ project_id: project });
      return NextResponse.json({ tasks });
    }

    const VALID: TaskStatus[] = ["todo", "doing", "done"];
    const status: TaskStatus | null = rawStatus && VALID.includes(rawStatus as TaskStatus)
      ? (rawStatus as TaskStatus)
      : null;

    const tasks = await listTasks({ project_id: project, status });
    return NextResponse.json({ tasks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });

    const task = await createTask({
      title,
      description: typeof body.description === "string" ? body.description : undefined,
      project_id: typeof body.project_id === "string" ? body.project_id : null,
      priority: body.priority ?? null,
      due_at: typeof body.due_at === "string" ? body.due_at : null,
      source: typeof body.source === "string" ? body.source : undefined,
    });
    return NextResponse.json({ ok: true, task });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
