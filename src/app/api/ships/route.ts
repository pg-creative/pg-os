import { NextRequest, NextResponse } from "next/server";
import {
  addShip,
  listShips,
  currentStreak,
  velocityPerWeek,
  shipsPerDayLast30,
  shippedToday,
  type Ship,
} from "@/lib/shipLog";

export type ShipsResponse = {
  ships: Ship[];
  streak: number;
  velocity: number;
  last30: { day: string; count: number }[];
  shippedToday: boolean;
};

export async function GET() {
  const [ships, streak, velocity, last30, today] = await Promise.all([
    listShips(50),
    currentStreak(),
    velocityPerWeek(),
    shipsPerDayLast30(),
    shippedToday(),
  ]);
  return NextResponse.json({
    ships,
    streak,
    velocity,
    last30,
    shippedToday: today,
  } satisfies ShipsResponse);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 });
  const ship = await addShip(text, body.context ?? null);
  return NextResponse.json({ ok: true, ship });
}
