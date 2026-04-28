"use client";
import { useLocation } from "./useLocation";

// Bookmarked landmarks — shows distance from user's actual position.
const LANDMARKS: { name: string; lat: number; lng: number }[] = [
  { name: "Studio",           lat: 41.8781, lng: -87.6298 }, // Chicago downtown placeholder — override when PG gives real
  { name: "Metrasens HQ",     lat: 42.0474, lng: -87.9730 }, // Elk Grove Village
  { name: "Lincoln Park Loop",lat: 41.9214, lng: -87.6336 },
];

function haversineMi(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function LocationLive() {
  const loc = useLocation();

  if (loc.status === "loading" && !loc.city) {
    return (
      <>
        <div style={{ flex: 1 }} />
        <div className="loc-city">Locating&hellip;</div>
        <div className="loc-meta">GEOLOCATION · WAITING FOR PERMISSION</div>
      </>
    );
  }

  if (loc.status === "denied" || loc.status === "error" || (loc.status !== "ok" && !loc.city)) {
    // Soft empty state — the home view shouldn't be dominated by a giant red
    // error when permission is denied or geolocation just isn't available.
    return (
      <>
        <div style={{ flex: 1 }} />
        <div className="loc-city" style={{ opacity: 0.6 }}>Location off</div>
        <div className="loc-meta" style={{ opacity: 0.55 }}>
          {loc.status === "denied" ? "tap retry to enable" : "tap retry to locate"}
        </div>
        <div className="loc-coords">
          <button
            className="loc-refresh"
            onClick={() => loc.refresh({ force: true })}
            style={{ marginLeft: "auto" }}
          >
            retry
          </button>
        </div>
      </>
    );
  }

  // OK — render real data (possibly from cache while re-fetching).
  const me = loc.lat != null && loc.lng != null ? { lat: loc.lat, lng: loc.lng } : null;
  const landmarks = me
    ? LANDMARKS.map((l) => ({ ...l, distanceMi: haversineMi(me, l) })).sort((a, b) => a.distanceMi - b.distanceMi)
    : LANDMARKS.map((l) => ({ ...l, distanceMi: null as number | null }));

  return (
    <>
      <div style={{ flex: 1 }} />
      <div className="loc-city">
        {loc.city ?? "—"}{loc.state ? <>, <em>{loc.state}</em></> : null}
      </div>
      <div className="loc-meta">
        {loc.country ?? ""}{loc.condition ? ` · ${loc.condition}` : ""}{loc.tempF != null ? ` · ${loc.tempF}°F` : ""}
      </div>
      <div className="loc-list">
        {landmarks.map((l) => (
          <div className="loc-item" key={l.name}>
            <span>{l.name}</span>
            <span className="num">{l.distanceMi != null ? `${l.distanceMi.toFixed(1)} MI` : "—"}</span>
          </div>
        ))}
      </div>
      <div className="loc-coords">
        <span>
          {loc.lat != null ? `${loc.lat.toFixed(4)}° ${loc.lat >= 0 ? "N" : "S"}` : "—"} ·{" "}
          {loc.lng != null ? `${Math.abs(loc.lng).toFixed(4)}° ${loc.lng >= 0 ? "E" : "W"}` : "—"}
        </span>
        <span>
          {loc.alt != null ? `ALT ${Math.round(loc.alt)}M` : ""}
          <button
            className="loc-refresh"
            onClick={() => loc.refresh({ force: true })}
            title="Refresh location"
            aria-label="Refresh location"
          >
            ↻
          </button>
        </span>
      </div>
    </>
  );
}

export function CityTemp() {
  const loc = useLocation();
  if (loc.status !== "ok" || !loc.city) return <>LOCATING…</>;
  const cityPart = loc.state ? `${loc.city.toUpperCase()}, ${loc.state.slice(0, 2).toUpperCase()}` : loc.city.toUpperCase();
  return (
    <>
      {cityPart}
      {loc.tempF != null ? <> · <b>{loc.tempF}°F</b></> : null}
    </>
  );
}
