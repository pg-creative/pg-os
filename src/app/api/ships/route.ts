import { NextRequest, NextResponse } from "next/server";
import {
  addShip,
  listShips,
  currentStreak,
  velocityPerWeek,
  shipsPerDayLast30,
  shippedToday,
} from "@/lib/shipLog";

export type ShipsResponse = {
  ships: ReturnType<typeof listShips>;
  streak: number;
  velocity: number;
  last30: { day: string; count: number }[];
  shippedToday: boolean;
};

export async function GET() {
  return NextResponse.json({
    ships: listShips(50),
    streak: currentStreak(),
    velocity: velocityPerWeek(),
    last30: shipsPerDayLast30(),
    shippedToday: shippedToday(),
  } satisfies ShipsResponse);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 });
  const ship = addShip(text, body.context ?? null);
  return NextResponse.json({ ok: true, ship });
}
