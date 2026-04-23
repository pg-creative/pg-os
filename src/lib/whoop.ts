const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const API_BASE = "https://api.prod.whoop.com/developer/v2";

export const WHOOP_SCOPES = [
  "read:recovery",
  "read:sleep",
  "read:cycles",
  "read:workout",
  "read:profile",
  "offline",
].join(" ");

function env() {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Whoop env vars");
  }
  return { clientId, clientSecret, redirectUri };
}

export function whoopAuthUrl(state: string) {
  const { clientId, redirectUri } = env();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: WHOOP_SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeWhoopCode(code: string) {
  const { clientId, clientSecret, redirectUri } = env();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Whoop token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
}

export async function refreshWhoopToken(refreshToken: string) {
  const { clientId, clientSecret } = env();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: WHOOP_SCOPES,
    }),
  });
  if (!res.ok) throw new Error(`Whoop refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

type WhoopRecovery = {
  score: { recovery_score: number; hrv_rmssd_milli: number; resting_heart_rate: number };
};
type WhoopSleep = {
  score: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      total_awake_time_milli: number;
    };
    sleep_performance_percentage?: number;
  };
};

export type WhoopVitals = {
  recovery: number | null;        // 0-100
  hrv: number | null;              // ms
  restingHr: number | null;        // bpm
  sleepHours: number | null;       // total time asleep (hours)
  sleepPerformance: number | null; // percentage
};

export async function fetchWhoopVitals(accessToken: string): Promise<WhoopVitals> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [recovRes, sleepRes] = await Promise.all([
    fetch(`${API_BASE}/recovery?limit=1`, { headers, cache: "no-store" }),
    fetch(`${API_BASE}/activity/sleep?limit=1`, { headers, cache: "no-store" }),
  ]);

  let recovery: number | null = null, hrv: number | null = null, restingHr: number | null = null;
  if (recovRes.ok) {
    const j = await recovRes.json();
    const first = (j.records ?? [])[0] as WhoopRecovery | undefined;
    if (first?.score) {
      recovery = first.score.recovery_score ?? null;
      hrv = first.score.hrv_rmssd_milli ?? null;
      restingHr = first.score.resting_heart_rate ?? null;
    }
  } else {
    console.error("[whoop] recovery fetch failed:", recovRes.status, await recovRes.text().catch(() => ""));
  }

  let sleepHours: number | null = null, sleepPerformance: number | null = null;
  if (sleepRes.ok) {
    const j = await sleepRes.json();
    const first = (j.records ?? [])[0] as WhoopSleep | undefined;
    if (first?.score?.stage_summary) {
      const s = first.score.stage_summary;
      const asleepMs = (s.total_in_bed_time_milli ?? 0) - (s.total_awake_time_milli ?? 0);
      sleepHours = asleepMs > 0 ? +(asleepMs / 3_600_000).toFixed(1) : null;
      sleepPerformance = first.score.sleep_performance_percentage ?? null;
    }
  } else {
    console.error("[whoop] sleep fetch failed:", sleepRes.status, await sleepRes.text().catch(() => ""));
  }

  return { recovery, hrv, restingHr, sleepHours, sleepPerformance };
}
