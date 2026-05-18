/**
 * Pixel Agents singleton — Next.js-friendly replacement for the
 * standalone Express+WS server. Owns:
 *   - JsonlWatcher (one per process)
 *   - agents map + nextAgentId
 *   - asset bundle (characters, walls, floors, furniture, layout)
 *   - persisted layout + agent seats (~/.pixel-agents/)
 *   - set of SSE controllers (one per connected browser tab)
 *
 * Survives Next.js dev-mode HMR via a globalThis-bound singleton.
 */

import { join, dirname } from "path";
import { homedir } from "os";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { JsonlWatcher, type WatchedFile } from "./watcher";
import { processTranscriptLine } from "./parser";
import {
  loadCharacterSprites,
  loadWallTiles,
  loadFloorTiles,
  loadFurnitureAssets,
  loadDefaultLayout,
  type LoadedCharacterSprites,
  type LoadedWallTiles,
  type LoadedFloorTiles,
  type LoadedFurnitureAssets,
} from "./assetLoader";
import type { TrackedAgent, ServerMessage } from "./types";

const ASSETS_ROOT = join(process.cwd(), "public", "pixel-agents");
const PERSIST_DIR = join(homedir(), ".pixel-agents");
const PERSISTED_LAYOUT = join(PERSIST_DIR, "layout.json");
const PERSISTED_SEATS = join(PERSIST_DIR, "agent-seats.json");

type SeatMeta = { palette: number; hueShift: number; seatId: string | null };

class PixelAgentsInstance {
  agents = new Map<string, TrackedAgent>();
  nextAgentId = 1;
  controllers = new Set<ReadableStreamDefaultController<Uint8Array>>();
  encoder = new TextEncoder();

  characterSprites: LoadedCharacterSprites | null = null;
  wallTiles: LoadedWallTiles | null = null;
  floorTiles: LoadedFloorTiles | null = null;
  furnitureAssets: LoadedFurnitureAssets | null = null;
  currentLayout: Record<string, unknown> | null = null;
  persistedSeats: Record<number, SeatMeta> | null = null;

  watcher: JsonlWatcher;
  started = false;

  constructor() {
    console.log("[pixel-agents] instance created");
    this.characterSprites = loadCharacterSprites(ASSETS_ROOT);
    this.wallTiles = loadWallTiles(ASSETS_ROOT);
    this.floorTiles = loadFloorTiles(ASSETS_ROOT);
    this.furnitureAssets = loadFurnitureAssets(ASSETS_ROOT);
    this.currentLayout = this.loadLayout();
    this.persistedSeats = this.loadSeats();
    this.watcher = new JsonlWatcher();
    this.wireWatcher();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.watcher.start();
    console.log("[pixel-agents] watcher started");
  }

  private wireWatcher(): void {
    this.watcher.on("fileAdded", (file: WatchedFile) => {
      if (this.agents.has(file.sessionId)) return;
      const agent: TrackedAgent = {
        id: this.nextAgentId++,
        sessionId: file.sessionId,
        projectDir: dirname(file.path),
        projectName: file.projectName,
        jsonlFile: file.path,
        fileOffset: 0,
        lineBuffer: "",
        activity: "idle",
        activeTools: new Map(),
        activeToolNames: new Map(),
        activeSubagentToolIds: new Map(),
        activeSubagentToolNames: new Map(),
        isWaiting: false,
        permissionSent: false,
        hadToolsInTurn: false,
        lastActivityTime: Date.now(),
      };
      this.agents.set(file.sessionId, agent);
      this.broadcast({
        type: "agentCreated",
        id: agent.id,
        folderName: agent.projectName,
      });
      console.log(
        `[pixel-agents] agent ${agent.id} joined: ${agent.projectName} (${file.sessionId.slice(0, 8)})`,
      );
    });

    this.watcher.on("fileRemoved", (file: WatchedFile) => {
      const agent = this.agents.get(file.sessionId);
      if (!agent) return;
      this.agents.delete(file.sessionId);
      this.broadcast({ type: "agentClosed", id: agent.id });
    });

    this.watcher.on("line", (file: WatchedFile, line: string) => {
      const agent = this.agents.get(file.sessionId);
      if (!agent) return;
      processTranscriptLine(line, agent, (msg) => this.broadcast(msg));
    });
  }

  broadcast(msg: ServerMessage): void {
    const payload = `data: ${JSON.stringify(msg)}\n\n`;
    const bytes = this.encoder.encode(payload);
    for (const controller of this.controllers) {
      try {
        controller.enqueue(bytes);
      } catch {
        // dead controller — will be removed on cancel
      }
    }
  }

  addClient(controller: ReadableStreamDefaultController<Uint8Array>): void {
    this.controllers.add(controller);
    this.sendInitialState(controller);
  }

  removeClient(controller: ReadableStreamDefaultController<Uint8Array>): void {
    this.controllers.delete(controller);
  }

  private sendOne(
    controller: ReadableStreamDefaultController<Uint8Array>,
    msg: Record<string, unknown>,
  ): void {
    try {
      controller.enqueue(
        this.encoder.encode(`data: ${JSON.stringify(msg)}\n\n`),
      );
    } catch {
      /* dead controller */
    }
  }

  private sendInitialState(
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): void {
    // Same order as upstream sendInitialData — order matters for the UI's layoutLoaded buffering
    this.sendOne(controller, { type: "settingsLoaded", soundEnabled: false });

    if (this.characterSprites) {
      this.sendOne(controller, {
        type: "characterSpritesLoaded",
        characters: this.characterSprites.characters,
      });
    }
    if (this.wallTiles) {
      this.sendOne(controller, {
        type: "wallTilesLoaded",
        sprites: this.wallTiles.sprites,
      });
    }
    if (this.floorTiles) {
      this.sendOne(controller, {
        type: "floorTilesLoaded",
        sprites: this.floorTiles.sprites,
      });
    }
    if (this.furnitureAssets) {
      this.sendOne(controller, {
        type: "furnitureAssetsLoaded",
        catalog: this.furnitureAssets.catalog,
        sprites: this.furnitureAssets.sprites,
      });
    }

    const agentList = Array.from(this.agents.values());
    const agentIds = agentList.map((a) => a.id);
    const folderNames: Record<number, string> = {};
    const agentMeta: Record<
      number,
      { palette?: number; hueShift?: number; seatId?: string }
    > = {};
    for (const a of agentList) {
      folderNames[a.id] = a.projectName;
      const s = this.persistedSeats?.[a.id];
      if (s) {
        agentMeta[a.id] = {
          palette: s.palette,
          hueShift: s.hueShift,
          seatId: s.seatId ?? undefined,
        };
      }
    }
    this.sendOne(controller, {
      type: "existingAgents",
      agents: agentIds,
      folderNames,
      agentMeta,
    });

    // Layout last (UI buffers agents until this arrives)
    this.sendOne(controller, {
      type: "layoutLoaded",
      layout: this.currentLayout,
      version: this.currentLayout ? 1 : 0,
    });
  }

  handleClientMessage(msg: Record<string, unknown>): void {
    if (msg.type === "saveLayout") {
      this.persistLayout(msg.layout as Record<string, unknown>);
      // Re-broadcast to other tabs
      this.broadcast({
        type: "layoutLoaded",
        layout: msg.layout,
        version: 1,
      } as ServerMessage);
    } else if (msg.type === "saveAgentSeats") {
      this.persistSeats(msg.seats as Record<number, SeatMeta>);
    }
    // 'webviewReady' is a no-op — initial state was already sent on SSE open
  }

  private loadLayout(): Record<string, unknown> | null {
    if (existsSync(PERSISTED_LAYOUT)) {
      try {
        return JSON.parse(readFileSync(PERSISTED_LAYOUT, "utf-8"));
      } catch {
        /* fall through */
      }
    }
    return loadDefaultLayout(ASSETS_ROOT);
  }

  private loadSeats(): Record<number, SeatMeta> | null {
    if (existsSync(PERSISTED_SEATS)) {
      try {
        return JSON.parse(readFileSync(PERSISTED_SEATS, "utf-8"));
      } catch {
        return null;
      }
    }
    return null;
  }

  private persistLayout(layout: Record<string, unknown>): void {
    try {
      mkdirSync(PERSIST_DIR, { recursive: true });
      writeFileSync(PERSISTED_LAYOUT, JSON.stringify(layout, null, 2));
      this.currentLayout = layout;
    } catch (err) {
      console.warn("[pixel-agents] failed to persist layout", err);
    }
  }

  private persistSeats(seats: Record<number, SeatMeta>): void {
    try {
      mkdirSync(PERSIST_DIR, { recursive: true });
      writeFileSync(PERSISTED_SEATS, JSON.stringify(seats, null, 2));
      this.persistedSeats = seats;
    } catch (err) {
      console.warn("[pixel-agents] failed to persist seats", err);
    }
  }
}

// HMR-safe singleton
const SYMBOL_KEY = Symbol.for("pgos.pixelAgents.instance");
type GlobalShape = typeof globalThis & {
  [SYMBOL_KEY]?: PixelAgentsInstance;
};

export function getInstance(): PixelAgentsInstance {
  const g = globalThis as GlobalShape;
  if (!g[SYMBOL_KEY]) {
    g[SYMBOL_KEY] = new PixelAgentsInstance();
    g[SYMBOL_KEY].start();
  }
  return g[SYMBOL_KEY]!;
}

export type { PixelAgentsInstance };
