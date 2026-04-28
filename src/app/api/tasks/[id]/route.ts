import { NextRequest, NextResponse } from "next/server";
import { updateTask, deleteTask } from "@/lib/tasks";

// PATCH /api/tasks/[id] — update any column
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const task = await updateTask(id, body);
    return NextResponse.json({ ok: true, task });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] — soft delete (status → 'archived')
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

    await deleteTask(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
