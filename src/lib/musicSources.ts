/**
 * Music source catalog — static station definitions for PG OS music player.
 * All sources are read-only; no runtime mutation.
 *
 * 2026-05-29: switched ENTIRELY to direct audio streams (HTML5 <audio>). The
 * old YouTube-iframe stations were unfixable — Lofi Girl / JRPG Radio disable
 * embedded playback (YouTube error 150), so they never produced sound no matter
 * what we did to the player. Direct streams have no embedding restriction, no
 * autoplay-policy fight, and no stale video IDs. Every URL below was verified to
 * load + play in the browser before shipping.
 */

export type MusicSource = "spotify" | "youtube" | "radio";
export type MusicGenre = "Lofi" | "Chill" | "Game" | "Ambient" | "Jazz";
export type PaletteFit = "day" | "twilight" | "midnight";

export interface Station {
  id: string;
  source: MusicSource;
  genre: MusicGenre;
  title: string;
  subtitle: string;
  /** For radio: direct stream URL. (Legacy: YouTube videoId / Spotify URI.) */
  sourceId: string;
  paletteFit?: PaletteFit;
  artworkUrl?: string;
}

export const STATIONS: Station[] = [
  {
    id: "lofi-beats",
    source: "radio",
    genre: "Lofi",
    title: "Lofi Beats",
    subtitle: "chill lofi hip hop to focus",
    sourceId: "https://stream.laut.fm/lofi",
    paletteFit: "day",
  },
  {
    id: "fluid",
    source: "radio",
    genre: "Lofi",
    title: "Fluid",
    subtitle: "lofi & future beats",
    sourceId: "https://ice2.somafm.com/fluid-128-mp3",
    paletteFit: "twilight",
  },
  {
    id: "groove-salad",
    source: "radio",
    genre: "Chill",
    title: "Groove Salad",
    subtitle: "mellow downtempo grooves",
    sourceId: "https://ice1.somafm.com/groovesalad-128-mp3",
    paletteFit: "day",
  },
  {
    id: "game-remix",
    source: "radio",
    genre: "Game",
    title: "Game Remix Radio",
    subtitle: "Final Fantasy · Zelda · Chrono remixes",
    sourceId: "https://relay.rainwave.cc/ocremix.mp3",
    paletteFit: "twilight",
  },
  {
    id: "secret-agent",
    source: "radio",
    genre: "Jazz",
    title: "Secret Agent",
    subtitle: "spy jazz & late-night lounge",
    sourceId: "https://ice1.somafm.com/secretagent-128-mp3",
    paletteFit: "twilight",
  },
  {
    id: "drone-zone",
    source: "radio",
    genre: "Ambient",
    title: "Drone Zone",
    subtitle: "atmospheric ambient textures",
    sourceId: "https://ice4.somafm.com/dronezone-128-mp3",
    paletteFit: "midnight",
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
