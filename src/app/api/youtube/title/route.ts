import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export type YouTubeTitleResponse = {
  videoId: string;
  title: string | null;
  author: string | null;
  thumbnail: string | null;
  fetchedAt: number;
  error?: string;
};

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

type OEmbedResponse = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("v");

  if (!videoId || !VIDEO_ID_RE.test(videoId)) {
    return NextResponse.json({ error: "invalid videoId" }, { status: 400 });
  }

  const fetchedAt = Date.now();
  const fallback: YouTubeTitleResponse = {
    videoId,
    title: null,
    author: null,
    thumbnail: null,
    fetchedAt,
    error: "fetch failed",
  };

  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(oEmbedUrl, {
      cache: "force-cache",
      signal: controller.signal,
    });

    if (!res.ok) {
      return NextResponse.json(fallback);
    }

    const data: OEmbedResponse = await res.json();

    const response: YouTubeTitleResponse = {
      videoId,
      title: data.title ?? null,
      author: data.author_name ?? null,
      thumbnail: data.thumbnail_url ?? null,
      fetchedAt,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(fallback);
  } finally {
    clearTimeout(timer);
  }
}
