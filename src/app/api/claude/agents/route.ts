import { NextResponse } from "next/server";
import { getAgentHealth } from "@/lib/agentHealth";

export async function GET() {
  const agents = await getAgentHealth();
  return NextResponse.json({ agents });
}
