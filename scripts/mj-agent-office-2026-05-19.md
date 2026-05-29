# Agent Office Midjourney Prompt Batch — 2026-05-19

> Character portraits + environment backdrops for the PG OS **Cockpit** agent-office.
> Locked DNA per `~/.claude/rules/visual-style.md` + design spec
> `~/.claude/research/agent-office-character-system-2026-05-16.md`.
>
> Output convention (consumed by `AgentLab/sections/types.ts` `assetUrl()`):
>   `public/agent-office/characters/<slug>.png`
>   `public/agent-office/environments/<slug>.png`
>
> Run: `LEGNEXT_API_KEY=... python3 scripts/run-mj-batch.py \
>   --prompts-file scripts/mj-agent-office-2026-05-19.md \
>   --out-dir /Users/pg/CEREBRUM/personal-os/public/agent-office`
>
> 8 prompts × 4 candidates = 32 images, ~640 credits.

## Character portraits (5 — one per class archetype)

Each is a painted Ghibli cel character portrait, 1:1, framed bust composition,
warm golden-hour key light, isolated so it drops cleanly into a card frame.
Class is derived from each agent's tool-usage profile (Write→scribe, Read/Grep→ranger,
Bash→smith, plan/research→sage, generalist→wayfarer).

### 1. Scribe (Write/Edit) -> `characters/scribe.png`
```
Studio Ghibli anime cel animation character portrait, a calm robed scribe holding a glowing quill, warm cream and gold robes with a single emerald clasp, profile bust turned toward the light, golden hour key light from the side, anime cel shading not watercolor, rich golds and deep blues palette, painted character art with depth, Howls Moving Castle character art direction, magical floating golden particles, no text, isolated clean composition --v 7 --ar 1:1
```

### 2. Ranger (Read/Grep/Glob/Search) -> `characters/ranger.png`
```
Studio Ghibli anime cel animation character portrait, a hooded ranger explorer holding an open map and brass spyglass, weathered amber travel cloak, profile bust turned toward warm light, golden hour key light, anime cel shading not watercolor, rich golds and deep blues with sapphire accents, painted character art with depth, Howls Moving Castle character art direction, magical floating particles, no text, isolated clean composition --v 7 --ar 1:1
```

### 3. Smith (Bash/build/run) -> `characters/smith.png`
```
Studio Ghibli anime cel animation character portrait, a sturdy artisan smith resting a small glowing hammer on the shoulder, soot-warmed apron over cream tunic, profile bust lit by forge-gold light, golden hour and ember key light, anime cel shading not watercolor, rich golds and deep warm blues with ruby ember accents, painted character art with depth, Howls Moving Castle character art direction, magical floating embers, no text, isolated clean composition --v 7 --ar 1:1
```

### 4. Sage (plan/research/think) -> `characters/sage.png`
```
Studio Ghibli anime cel animation character portrait, a wise elder sage holding a softly glowing tome with a tall carved staff, deep blue and cream robes with gold trim, profile bust in contemplative light, golden hour key light meeting cool shadow, anime cel shading not watercolor, rich golds and deep blues with emerald accents, painted character art with depth, Howls Moving Castle character art direction, magical floating particles, no text, isolated clean composition --v 7 --ar 1:1
```

### 5. Wayfarer (generalist / default) -> `characters/wayfarer.png`
```
Studio Ghibli anime cel animation character portrait, a young wayfarer traveler with a worn pack and a glowing handheld lantern, warm cream and amber layered travel clothes, profile bust turned toward the lantern light, golden hour key light, anime cel shading not watercolor, rich golds and deep blues and soft oranges, painted character art with depth, Howls Moving Castle character art direction, magical floating golden particles, no text, isolated clean composition --v 7 --ar 1:1
```

## Environment backdrops (3 — the worlds the characters live in)

Each is a painted Ghibli cel environment, 16:9, designed to sit BEHIND the
character cards (negative space lower-center for figures), warm golden-hour light.

### 6. Atelier (Howl's library interior) -> `environments/atelier.png`
```
Studio Ghibli anime cel animation, Howls Moving Castle library atelier interior at golden hour, tall arched windows pouring warm gold light across worn wooden workstations and floating tomes, anime cel shading not watercolor, rich golds and deep blues and soft cream, painted environment art with depth and atmosphere, magical floating golden particles, contemplative warmth, lower-center kept open and uncluttered, cinematic wide establishing shot --v 7 --ar 16:9
```

### 7. Camp (wayfarer campfire at dusk) -> `environments/camp.png`
```
Studio Ghibli anime cel animation, a wayfarers camp around a warm campfire at dusk, golden firelight glowing against deep blue evening, soft tents and travel packs at the edges, distant floating islands on the horizon, anime cel shading not watercolor, rich golds and coral and deep blues, painted environment art with depth, magical floating embers and particles, communal warmth, lower-center kept open for figures, cinematic wide shot --v 7 --ar 16:9
```

### 8. Guild Hall (adventurer's guild interior) -> `environments/guild.png`
```
Studio Ghibli anime cel animation, a warm adventurers guild hall interior, great stone hearth burning gold at one side, a posted quest board, banners and worn wooden tables, golden hour light through high windows, anime cel shading not watercolor, rich golds and deep blues with emerald and ruby banner accents, painted environment art with depth, Howls Moving Castle warmth, magical floating particles, lower-center kept open for figures, cinematic wide shot --v 7 --ar 16:9
```

---

**Total: 8 prompts.** ~640 credits. Each returns 4 candidates as `<slug>_0..3.png`.
A post-batch curation step copies the chosen candidate to the canonical `<slug>.png`
the lab loads (default: `_0` until PG curates).
