import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export type RadioNowResponse = {
  station: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  fetchedAt: number;
  error?: string;
};

const KNOWN_STATIONS: Record<string, string> = {
  dronezone: "dronezone",
  groovesalad: "groovesalad",
  deepspaceone: "deepspaceone",
  missioncontrol: "missioncontrol",
  fluid: "fluid",
};

type SomaFMSong = {
  title?: string;
  artist?: string;
  album?: string;
  albumArt?: string;
  date?: string;
};

type SomaFMResponse = {
  id?: string;
  songs?: SomaFMSong[];
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ station: string }> },
) {
  const { station } = await params;
  const stationId = KNOWN_STATIONS[station.toLowerCase()];

  if (!stationId) {
    return NextResponse.json({ error: "unknown station" }, { status: 404 });
  }

  const fetchedAt = Date.now();
  const fallback: RadioNowResponse = {
    station: stationId,
    title: null,
    artist: null,
    album: null,
    fetchedAt,
    error: "fetch failed",
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`https://somafm.com/songs/${stationId}.json`, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      return NextResponse.json(fallback);
    }

    const data: SomaFMResponse = await res.json();
    const current = data.songs?.[0];

    const response: RadioNowResponse = {
      station: stationId,
      title: current?.title ?? null,
      artist: current?.artist ?? null,
      album: current?.album ?? null,
      fetchedAt,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(fallback);
  } finally {
    clearTimeout(timer);
  }
}
