"use client";
import { useCallback, useEffect, useState } from "react";

export type LocationState = {
  status: "idle" | "loading" | "ok" | "denied" | "error";
  lat?: number;
  lng?: number;
  alt?: number | null;
  accuracyM?: number;
  city?: string;
  state?: string;
  country?: string;
  tempF?: number;
  condition?: string;
  conditionCode?: number;
  fetchedAt?: number;
  error?: string;
};

const CACHE_KEY = "pg-os-location";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const WEATHER_TTL_MS = 15 * 60 * 1000; // 15 min

function readCache(): LocationState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocationState;
  } catch {
    return null;
  }
}

function writeCache(state: LocationState) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch { /* quota — non-fatal */ }
}

async function reverseGeocode(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error(`geocode ${res.status}`);
  const j = await res.json();
  const a = j.address ?? {};
  return {
    city: a.city ?? a.town ?? a.village ?? a.hamlet ?? a.suburb ?? a.county,
    state: a.state,
    country: a.country,
  };
}

async function fetchWeather(lat: number, lng: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const j = await res.json();
  const c = j.current ?? {};
  return {
    tempF: typeof c.temperature_2m === "number" ? Math.round(c.temperature_2m) : undefined,
    conditionCode: typeof c.weather_code === "number" ? c.weather_code : undefined,
  };
}

function weatherCodeToLabel(code?: number): string | undefined {
  if (code == null) return undefined;
  // WMO codes — abbreviated mapping.
  if (code === 0) return "CLEAR";
  if (code <= 3) return "PARTLY CLOUDY";
  if (code <= 48) return "FOG";
  if (code <= 57) return "DRIZZLE";
  if (code <= 67) return "RAIN";
  if (code <= 77) return "SNOW";
  if (code <= 82) return "SHOWERS";
  if (code <= 86) return "SNOW SHOWERS";
  if (code <= 99) return "THUNDERSTORM";
  return undefined;
}

function getPosition(options: PositionOptions = {}): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("geolocation_unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({ status: "idle" });

  const refresh = useCallback(async (opts: { force?: boolean } = {}) => {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const pos = await getPosition({ enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 });
      const { latitude: lat, longitude: lng, altitude, accuracy } = pos.coords;

      const cached = readCache();
      const positionMoved =
        !cached?.lat || !cached?.lng ||
        Math.abs((cached.lat ?? 0) - lat) > 0.01 ||
        Math.abs((cached.lng ?? 0) - lng) > 0.01;
      const geocodeStale = !cached?.city || (Date.now() - (cached?.fetchedAt ?? 0)) > CACHE_TTL_MS;
      const weatherStale = cached?.tempF == null || (Date.now() - (cached?.fetchedAt ?? 0)) > WEATHER_TTL_MS;

      let geo = { city: cached?.city, state: cached?.state, country: cached?.country };
      if (opts.force || positionMoved || geocodeStale) {
        try { geo = await reverseGeocode(lat, lng); } catch { /* keep cached */ }
      }

      let weather: { tempF?: number; conditionCode?: number } = {
        tempF: cached?.tempF, conditionCode: cached?.conditionCode,
      };
      if (opts.force || positionMoved || weatherStale) {
        try { weather = await fetchWeather(lat, lng); } catch { /* keep cached */ }
      }

      const next: LocationState = {
        status: "ok",
        lat, lng, alt: altitude, accuracyM: accuracy,
        ...geo,
        ...weather,
        condition: weatherCodeToLabel(weather.conditionCode),
        fetchedAt: Date.now(),
      };
      setState(next);
      writeCache(next);
    } catch (err) {
      const raw = err as GeolocationPositionError | Error;
      const denied = "code" in raw && raw.code === 1;
      setState({
        status: denied ? "denied" : "error",
        error: raw instanceof Error ? raw.message : String(raw),
      });
    }
  }, []);

  // Boot: use cache immediately, then refresh in background.
  useEffect(() => {
    const cached = readCache();
    if (cached && cached.status === "ok") {
      setState(cached);
    }
    refresh();
  }, [refresh]);

  // Refresh weather every 15 min while tab is visible.
  useEffect(() => {
    const i = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, WEATHER_TTL_MS);
    return () => clearInterval(i);
  }, [refresh]);

  return { ...state, refresh } as LocationState & { refresh: (opts?: { force?: boolean }) => Promise<void> };
}
