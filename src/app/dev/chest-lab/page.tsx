"use client";

import { useCallback, useEffect, useState } from "react";
import { ChestCard } from "@/app/_components/Chest/ChestCard";
import { ChestRevealModal } from "@/app/_components/Chest/ChestRevealModal";
import { CoinBalance } from "@/app/_components/Chest/CoinBalance";
import { SoulBeingCard } from "@/app/_components/Avatar/SoulBeingCard";
import { CustomizeSheet } from "@/app/_components/Avatar/CustomizeSheet";
import type { Chest, ChestPullResult, ChestType } from "@/lib/chests";
import type { AvatarState, Cosmetic, CosmeticSlot } from "@/lib/avatar";

interface ChestApiData {
  connected: boolean;
  catalog: Chest[];
  coins: number;
  dailyPulls: { used: number; cap: number };
  recentPulls: ChestPullResult[];
  hint?: string;
  error?: string;
}

interface AvatarApiData {
  connected: boolean;
  state: AvatarState | null;
  name: string | null;
  catalog: Cosmetic[];
  hint?: string;
  error?: string;
}

/**
 * /dev/chest-lab — preview of the Phase 3 chest economy + soul-being.
 *
 * If HC isn't connected, falls back to a demo/static catalog with mock
 * coins so PG can see the UI render without HC env vars set.
 */
export default function ChestLabPage() {
  const [chestData, setChestData] = useState<ChestApiData | null>(null);
  const [avatarData, setAvatarData] = useState<AvatarApiData | null>(null);
  const [reveal, setReveal] = useState<ChestPullResult | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        fetch("/api/chests").then((r) => r.json()),
        fetch("/api/avatar").then((r) => r.json()),
      ]);
      setChestData(c);
      setAvatarData(a);
    } catch {
      setErr("Failed to load — using mock data");
      setChestData(MOCK_CHESTS);
      setAvatarData(MOCK_AVATAR);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handlePull(chestType: ChestType) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/chests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pull", chestType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error ?? "pull_failed");
        return;
      }
      setReveal(json.pull as ChestPullResult);
      await loadAll();
    } catch {
      setErr("pull_request_failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseReveal() {
    if (reveal) {
      // Open it server-side (idempotent) so cosmetics persist.
      try {
        await fetch("/api/chests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "open", pullId: reveal.pullId }),
        });
        await loadAll();
      } catch {
        /* swallow */
      }
    }
    setReveal(null);
  }

  async function handleEquip(slot: CosmeticSlot, key: string | null) {
    try {
      const body: Record<string, unknown> = {};
      body[slot] = key;
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) await loadAll();
    } catch {
      /* swallow */
    }
  }

  async function handleNameChange(name: string) {
    try {
      await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "name", name }),
      });
      await loadAll();
    } catch {
      /* swallow */
    }
  }

  const c = chestData ?? MOCK_CHESTS;
  const a = avatarData ?? MOCK_AVATAR;
  const tier: string = "F"; // PG's tier comes from /api/habits — for the lab we just gate Crystal as locked
  const tierOrder = ["F", "D", "C", "B", "A", "S", "SSS"];
  const isUnlocked = (chest: Chest) => tierOrder.indexOf(tier) >= tierOrder.indexOf(chest.unlockTier);
  const capReached = c.dailyPulls.used >= c.dailyPulls.cap;

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 920,
        margin: "0 auto",
        color: "var(--fg)",
        fontSize: 14,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Chest Lab</h1>
        <CoinBalance coins={c.coins} />
      </header>

      {!c.connected && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "rgba(255, 199, 124, 0.08)",
            border: "1px solid rgba(255, 199, 124, 0.25)",
            fontSize: 12,
          }}
        >
          HC not connected — showing static catalog. {c.hint ?? ""}
        </div>
      )}

      {err && (
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            background: "rgba(220, 90, 90, 0.1)",
            border: "1px solid rgba(220, 90, 90, 0.3)",
            color: "#ffb8b8",
            fontSize: 12,
          }}
          role="alert"
        >
          {err}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 24,
          alignItems: "start",
        }}
        className="cl-grid"
      >
        <SoulBeingCard
          state={a.state ?? {}}
          name={a.name}
          onNameChange={handleNameChange}
          onCustomize={() => setCustomizing(true)}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, opacity: 0.85 }}>
            Chests · {c.dailyPulls.used}/{c.dailyPulls.cap} pulls today
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {c.catalog.map((chest) => (
              <ChestCard
                key={chest.type}
                chest={chest}
                coins={c.coins}
                unlocked={isUnlocked(chest)}
                capReached={capReached}
                onPull={handlePull}
                busy={busy}
              />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px", opacity: 0.85 }}>
          Recent pulls
        </h2>
        {c.recentPulls.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>
            No pulls yet. Earn 50 coins (~500 XP) and try the Wooden chest.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {c.recentPulls.map((p) => (
              <li
                key={p.pullId}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(218,165,90,0.15)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span>
                  <span style={{ textTransform: "capitalize", opacity: 0.7 }}>{p.chestType}</span>
                  {" · "}
                  <span style={{ fontWeight: 600 }}>{p.reward.label}</span>
                </span>
                <span style={{ opacity: 0.6 }}>{new Date(p.pulledAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {reveal && <ChestRevealModal pull={reveal} onClose={handleCloseReveal} />}

      {customizing && a.state && (
        <CustomizeSheet
          state={a.state}
          catalog={a.catalog}
          onClose={() => setCustomizing(false)}
          onEquip={handleEquip}
        />
      )}
    </main>
  );
}

// ---------- Mock fallback ----------

const MOCK_CHESTS: ChestApiData = {
  connected: false,
  hint: "Add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local",
  coins: 320,
  dailyPulls: { used: 0, cap: 5 },
  recentPulls: [],
  catalog: [
    { type: "wood", name: "Wooden Chest", costCoins: 50, rarity: "common", description: "Brass-banded oak.", unlockTier: "F" },
    { type: "silver", name: "Silver Chest", costCoins: 200, rarity: "uncommon", description: "Cool moonlit silver.", unlockTier: "F" },
    { type: "gold", name: "Golden Chest", costCoins: 500, rarity: "rare", description: "Glowing amber gold.", unlockTier: "F" },
    { type: "crystal", name: "Crystal Chest", costCoins: 1500, rarity: "legendary", description: "Refracts golden hour. Locked until S.", unlockTier: "S" },
  ],
};

const MOCK_AVATAR: AvatarApiData = {
  connected: false,
  state: {
    palette: "dawn",
    aura: "sparkle",
    hat: null,
    companion: null,
    owned: { hat: [], aura: ["sparkle"], companion: [], palette: ["dawn"] },
  },
  name: null,
  catalog: [
    { key: "mossleaf", slot: "hat", label: "Mossleaf", flavour: "A small green leaf, slightly damp.", rarity: "common" },
    { key: "brass-pin", slot: "hat", label: "Brass Pin", flavour: "Inscribed with a name no one remembers.", rarity: "uncommon" },
    { key: "paper-crane", slot: "hat", label: "Paper Crane", flavour: "Folded by someone who loved you.", rarity: "rare" },
    { key: "antler-crown", slot: "hat", label: "Antler Crown", flavour: "Found in the forest. Yours now.", rarity: "legendary" },
    { key: "sparkle", slot: "aura", label: "Sparkle", flavour: "The default warmth.", rarity: "common" },
    { key: "ember", slot: "aura", label: "Ember", flavour: "Coal-warm.", rarity: "common" },
    { key: "frost", slot: "aura", label: "Frost", flavour: "Cool blue.", rarity: "uncommon" },
    { key: "moonlight", slot: "aura", label: "Moonlight", flavour: "Pale silver.", rarity: "rare" },
    { key: "aurora", slot: "aura", label: "Aurora", flavour: "Slowly breathing.", rarity: "legendary" },
    { key: "kodama", slot: "companion", label: "Kodama", flavour: "Tiny, pale, head tilts.", rarity: "uncommon" },
    { key: "soot-sprite", slot: "companion", label: "Soot Sprite", flavour: "Carries small things.", rarity: "rare" },
    { key: "lantern-fox", slot: "companion", label: "Lantern Fox", flavour: "Walks ahead, waits at every turn.", rarity: "legendary" },
    { key: "dawn", slot: "palette", label: "Dawn", flavour: "Coral and warm cream.", rarity: "common" },
    { key: "dusk", slot: "palette", label: "Dusk", flavour: "Deep amber and indigo.", rarity: "uncommon" },
    { key: "midnight", slot: "palette", label: "Midnight", flavour: "Ink and ember-gold.", rarity: "rare" },
    { key: "aurora", slot: "palette", label: "Aurora Palette", flavour: "Greens, violets, polar.", rarity: "legendary" },
  ],
};
