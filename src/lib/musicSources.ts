/**
 * Music source catalog — static station definitions for PG OS music player.
 * All sources are read-only; no runtime mutation.
 */

export type MusicSource = "spotify" | "youtube" | "radio";
export type PaletteFit = "day" | "twilight" | "midnight";

export interface Station {
  id: string;
  source: MusicSource;
  title: string;
  subtitle: string;
  /** For YouTube: videoId. For Spotify: context URI. For radio: stream URL. */
  sourceId: string;
  paletteFit?: PaletteFit;
  artworkUrl?: string;
}

export const STATIONS: Station[] = [
  {
    id: "lofi-girl-hiphop",
    source: "youtube",
    title: "Lofi Girl",
    subtitle: "lofi hip hop radio",
    sourceId: "jfKfPfyJRdk",
    paletteFit: "day",
  },
  {
    id: "lofi-girl-asian",
    source: "youtube",
    title: "Lofi Girl",
    subtitle: "asian lofi radio",
    sourceId: "Na0w3Mz46GA",
    paletteFit: "day",
  },
  {
    id: "jrpg-radio",
    source: "youtube",
    title: "JRPG Radio",
    subtitle: "Final Fantasy · Kingdom Hearts · Chrono",
    sourceId: "P6Dgj2PH4d4",
    paletteFit: "twilight",
  },
  {
    id: "ghibli-hisaishi-lofi",
    source: "spotify",
    title: "Ghibli x Lofi",
    subtitle: "Songs sampling Hisaishi/Miyazaki",
    sourceId: "spotify:playlist:2B7FIViUFp2tzyN6pXaMfq",
    paletteFit: "day",
  },
  {
    id: "somafm-drone",
    source: "radio",
    title: "SomaFM Drone Zone",
    subtitle: "Atmospheric textures with minimal beats",
    sourceId: "https://ice4.somafm.com/dronezone-128-mp3",
    paletteFit: "midnight",
  },
  {
    id: "chillhop-jazzy",
    source: "youtube",
    title: "Chillhop",
    subtitle: "jazzy beats radio",
    sourceId: "5yx6BWlEVcY",
    paletteFit: "day",
  },
];

/** Look up a station by its ID. Returns undefined if not found. */
export function getStation(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

/** Return all stations that fit a given palette. */
export function STATIONS_BY_PALETTE(palette: PaletteFit): Station[] {
  return STATIONS.filter((s) => s.paletteFit === palette);
}
