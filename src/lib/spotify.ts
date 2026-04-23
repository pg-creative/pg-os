const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-read-recently-played",
  "user-modify-playback-state",
].join(" ");

function env() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Spotify env vars");
  }
  return { clientId, clientSecret, redirectUri };
}

export function spotifyAuthUrl(state: string) {
  const { clientId, redirectUri } = env();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

function basicAuth() {
  const { clientId, clientSecret } = env();
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export async function exchangeSpotifyCode(code: string) {
  const { redirectUri } = env();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  };
}

export async function refreshSpotifyToken(refreshToken: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Spotify refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  };
}

export type SpotifyNowPlaying = {
  playing: boolean;
  track?: {
    id: string;
    name: string;
    artists: string;
    album: string;
    albumArt: string | null;
    progressMs: number;
    durationMs: number;
    externalUrl: string;
  };
};

export async function fetchSpotifyNowPlaying(accessToken: string): Promise<SpotifyNowPlaying> {
  const res = await fetch(`${API_BASE}/me/player/currently-playing`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 204) return { playing: false };
  if (!res.ok) throw new Error(`Spotify now-playing failed: ${res.status}`);
  const data = await res.json();
  if (!data || !data.item) return { playing: false };
  const t = data.item;
  return {
    playing: Boolean(data.is_playing),
    track: {
      id: t.id,
      name: t.name,
      artists: (t.artists ?? []).map((a: { name: string }) => a.name).join(", "),
      album: t.album?.name ?? "",
      albumArt: t.album?.images?.[0]?.url ?? null,
      progressMs: data.progress_ms ?? 0,
      durationMs: t.duration_ms ?? 0,
      externalUrl: t.external_urls?.spotify ?? "",
    },
  };
}

export async function spotifyCommand(
  accessToken: string,
  action: "play" | "pause" | "next" | "previous",
): Promise<{ ok: boolean; status: number; error?: string }> {
  let method: "PUT" | "POST" = "PUT";
  let path = "";
  switch (action) {
    case "play":     path = "/me/player/play";     method = "PUT";  break;
    case "pause":    path = "/me/player/pause";    method = "PUT";  break;
    case "next":     path = "/me/player/next";     method = "POST"; break;
    case "previous": path = "/me/player/previous"; method = "POST"; break;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 204 || res.status === 200) return { ok: true, status: res.status };
  const text = await res.text().catch(() => "");
  return { ok: false, status: res.status, error: text };
}
