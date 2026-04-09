# Game Design Document — StoryEngine

> Sprint 1 seed. Editor-in-chief: Design Leader. Contributions from Artist, Animator, Audio Director.

## Pillars
1. Story-first.
2. 5-minute shape.
3. LucasArts-style interactivity.
4. Handcrafted sprite charm.
5. Runs anywhere, cheap.

## Core Loop
**Explore → Talk → Solve → Story Beat → Next Beat → Resolution.**

A player enters a card (location), clicks to explore, talks to characters, solves a light puzzle or makes a meaningful choice, and the story advances. Collecting items opens new cards — "getting the compass" reveals the Cove. Five beats fit inside a 5-minute session with a clean ending.

Within a chapter, the player moves between **cards** (locations). Each card is a self-contained screen with its own actors, interactables, and beats. Inventory items gate card access — design constraint, not code constraint.

## Episodic World Model
The world persists across chapters: same characters, same locations, expanding map.

Inspired by LOST: imagine playing Jack as he explores the island, talks to survivors, discovers clues, and unlocks new locations — with the world expanding but much of the narrative happening in familiar places with new faces and revelations. Each chapter is a standalone 5-minute micro-adventure but connects to a larger mystery arc.

- Returning players find new cards unlocked, characters evolved, world expanded.
- Shorter play loops than traditional adventure games; Inkle-style multi-path branching within each chapter.
- Once the world and characters are defined, designers focus daily on new story beats, character interactions, and interactive elements — telling stories through the same world.

## Card / Location Metaphor
A **card** is the atomic spatial unit — one screen, one tilemap, its actors, its triggers, its dialogue.

- Cards are connected by **transitions** (doors, paths, discoveries).
- Inventory items are **keys** that gate card access. Authors define unlock relationships, not code.
- Authors think in cards and story beats, not in coordinate spaces or code.
- A card can contain multiple interactive zones, dialogue trees, and beat triggers.
- The card metaphor is inspired by HyperCard: each card is a complete, self-contained interactive space.

## Inventory & Discovery Mechanics
Lightweight inventory: items are **narrative keys**, not stats.

- **Discovery** = collecting an item that unlocks a card or reveals new information.
- No inventory management UI in V1 — items are contextual and automatic.
- Example: pick up the compass → the map card appears with the Cove highlighted → follow the compass to the Cove (a new card/location opens).
- Items can also gate dialogue options ("show the compass to the hermit → he tells you about the lighthouse").
- Keep the system minimal: items unlock things and enable conversations, nothing more.
- **World state persistence:** inventory persists across episodes via the **world state snapshot chain** — each episode reads the world as it was at the end of the previous one. Not a live database; just a simple JSON snapshot passed forward. See [`wiki/world-state.md`](wiki/world-state.md).

## Condition Language
Adventures use a simple condition system for branching dialogue, card access, beat triggers, and actor visibility.

**Supported:**
- Boolean flag check: `{ flag: "trusts_hermit", op: "==", value: true }`
- Numeric comparison: `{ flag: "hermit_trust_level", op: ">=", value: 0.5 }`
- Inventory check: `{ inventory: "compass" }` (shorthand: item exists)
- Episode progress: `{ episodeCompleted: { op: ">=", value: 3 } }`
- Location discovered: `{ location: "cove" }`

**Not supported (by design):** nested logic (`AND`/`OR` combinators). Complex conditions should be broken into multiple beats — this respects the 5-minute constraint and keeps authoring accessible to non-technical designers.

See [`wiki/world-state.md`](wiki/world-state.md) for full condition language spec.

## Starter State
Players joining mid-series get a **curated starter snapshot** — a hand-authored `starterState.json` with essential items, key flags, and discovered locations.

- Authored per-episode by Design Leader. Not auto-generated.
- Paired with a brief text recap ("Previously on...") so the player has narrative context.
- Players can always go back and play earlier episodes; the world state updates to reflect the completed chain.
- See [`wiki/world-state.md`](wiki/world-state.md) for schema and examples.

## Micro-Adventure Shape
- **Minute 0–1:** Hook — establish character, place, stakes.
- **Minute 1–3:** Exploration + dialogue + one small puzzle/choice.
- **Minute 3–4:** Turn — stakes raise, a decision matters.
- **Minute 4–5:** Resolution — the beat lands; clean finish.

No fail states that waste the player's time. Dead ends resolve into hints.

## Tone
Warm, curious, gently funny — the space between Day of the Tentacle's charm and A Short Hike's quiet generosity.

## Art Direction *(Artist)*
- Fixed internal resolution: **320×180**, crisp integer scaling to any display size.
- Fixed per-biome palettes.
- Tile grid size TBD Sprint 2 (candidate: 16×16).
- All art in texture atlases.
- Style guide lives at [`wiki/` — TBD](wiki/).

## Animation Direction *(Animator)*

> Principle: fewer, more expressive frames. Every frame earns its atlas space.
> Animations must never block input or extend the 5-minute session pacing.

### 1. Sprite Sizes

| Actor Type       | Sprite Cell   | Rationale                                                    |
|------------------|---------------|--------------------------------------------------------------|
| Player character | 16x24 px      | 16 px wide matches tile grid; 24 px tall gives head + torso + legs for readable silhouette at top-down perspective. |
| Major NPC        | 16x24 px      | Same rig as player for visual consistency.                   |
| Minor NPC / Prop | 16x16 px      | Single-tile characters (shopkeepers behind counters, seated characters, small creatures). |
| Large actor      | 32x32 px      | Bosses, mounts, large furniture. Max 2 per card.             |

Player and NPC sprites extend 8 px above their tile cell. The renderer draws them with a Y-offset of -8 so feet align to the tile grid. Collision uses the bottom 16x16 region.

### 2. Spritesheet Layout

A character spritesheet is a PNG organized as a grid of cells. Rows represent animation states; columns represent frames within that state. The first cell of each row is also the idle pose for that direction.

**Standard character sheet (16x24, 4-direction):**

| Row | State      | Frames | Notes                                         |
|-----|------------|--------|-----------------------------------------------|
| 0   | idle-down  | 1      | Standing, facing camera. Also walk-down frame 0. |
| 1   | walk-down  | 4      | Two-step cycle: stand, step-L, stand, step-R. |
| 2   | idle-up    | 1      |                                               |
| 3   | walk-up    | 4      |                                               |
| 4   | idle-left  | 1      |                                               |
| 5   | walk-left  | 4      |                                               |
| 6   | idle-right | 1      | Can be a horizontal flip of idle-left if symmetric. |
| 7   | walk-right | 4      | Can be a horizontal flip of walk-left if symmetric. |
| 8   | interact   | 3      | Reach / pick-up. Direction-agnostic or uses facing row offset. |
| 9   | emote      | 4      | Surprise, joy, etc. Shared across directions.  |
| 10  | hurt       | 2      | Flinch. Shared across directions.              |

**Minimum viable character sheet:** Rows 0-7 only (4 directions x idle+walk). Total: 20 cells = 320x24 px or 80x120 px depending on packing.

**Symmetric shortcut:** Authors may ship only left-facing rows. The engine flips horizontally at render time for right-facing. This halves the sheet to rows 0-5 + interact/emote/hurt.

**Minor NPC sheet (16x16):**

| Row | State     | Frames |
|-----|-----------|--------|
| 0   | idle-down | 2      |
| 1   | idle-up   | 2      |
| 2   | idle-side  | 2     |
| 3   | interact  | 2      |

### 3. Frame Counts and Speeds

| Animation Type       | Frames | FPS  | Loop Duration | Loop Mode |
|----------------------|--------|------|---------------|-----------|
| Walk cycle (4-dir)   | 4      | 8    | 500 ms        | Loop      |
| Idle breathe         | 2      | 2    | 1000 ms       | Loop      |
| Interact (pick up)   | 3      | 6    | 500 ms        | Once      |
| Emote (surprise)     | 4      | 8    | 500 ms        | Once      |
| Hurt flinch          | 2      | 6    | 333 ms        | Once      |
| Door opening         | 4      | 4    | 1000 ms       | Once      |
| Chest opening        | 3      | 4    | 750 ms        | Once      |
| Bookcase turning     | 6      | 3    | 2000 ms       | Once      |
| Torch flicker (tile) | 3      | 6    | 500 ms        | Loop      |
| Water shimmer (tile) | 4      | 4    | 1000 ms       | Loop      |

All FPS values are animation-local, independent of the engine's fixed 60 Hz logic tick. The Actor.animSpeed field stores the animation FPS; the engine accumulates dt and advances frames accordingly (already implemented).

### 4. Animation State Machine

**Character states:**

```
                +-------+
      stop      | IDLE  |<--------+
   +----------->|       |----+    |
   |            +-------+    |    |
   |               |         |    |
   |          velocity>0     |  anim_end
   |               |         |    |
   |            +-------+    |    |
   |            | WALK  |    |    |
   |            +-------+    |    |
   |                         |    |
   |          interact_key   |    |
   |               +---------+    |
   |               v              |
   |          +-----------+       |
   +----------| INTERACT  |-------+
   |          +-----------+
   |
   |          take_damage
   |               |
   |            +------+
   +------------| HURT |
                +------+
```

**Transition rules (evaluated each logic tick):**

1. IDLE -> WALK: velocity != (0,0).
2. WALK -> IDLE: velocity == (0,0).
3. Any -> INTERACT: interact input fires AND actor is near an interactable. Current state is pushed to a return stack.
4. INTERACT -> IDLE: interact animation completes (once-mode anim_end).
5. Any -> HURT: damage event received. Interrupts current state.
6. HURT -> IDLE: hurt animation completes.
7. Any -> EMOTE: scripted emote trigger from dialogue/beat system.
8. EMOTE -> IDLE: emote animation completes.

**Facing (4-direction):**

- `Facing` enum: `down | up | left | right` (already in Actor.ts).
- 8-direction is explicitly out of scope. The 320x180 resolution at 16 px tiles does not give enough pixel fidelity for diagonal sprite reads. 4-direction matches the LucasArts / top-down RPG convention.
- Facing updates from velocity on every tick via `Actor.updateFacing()` (already implemented). Facing is locked during INTERACT and HURT states.

**Rendering the correct row:**

The renderer resolves the spritesheet row as: `(facingIndex * 2) + (state == WALK ? 1 : 0)` for the base walk/idle states. Special states (interact, emote, hurt) use fixed row offsets. The `spriteId` field on Actor references a spritesheet definition that maps state names to row indices.

### 5. Event / Object Animations

Event animations (bookcase, door, chest) reuse the existing **group animation system**. No separate system needed. Rationale: GroupAnimation already supports multi-tile regions, phased sequences, variable speed, and finite loop counts. This is exactly what event animations require.

**Bookcase-turning example (multi-phase):**

```
Phase 1 — "slide" (loops: 1, speed: 3, 3 frames)
  Frame 0: bookcase normal
  Frame 1: bookcase shifted 4px right (drawn as alternate tiles)
  Frame 2: bookcase shifted 8px, gap visible

Phase 2 — "reveal" (loops: 1, speed: 4, 3 frames)
  Frame 0: bookcase fully aside, dark passage
  Frame 1: dust particles (sparse)
  Frame 2: passage clear, lit

Phase 3 — "hold" (loops: undefined [infinite], speed: 1, 1 frame)
  Frame 0: passage open (final resting state)
```

The action sequence `playGroupAnimation` triggers phase 1. Phases chain automatically (the engine's `advancePhased` already handles this). Dust particles are tile-art, not a particle system -- keeping the renderer simple.

**Door-opening example (single-phase):**

```
Phase 1 — (loops: 1, speed: 4, 4 frames)
  Frame 0: door closed
  Frame 1: door cracked
  Frame 2: door half open
  Frame 3: door open

Phase 2 — "hold" (loops: undefined, speed: 1, 1 frame)
  Frame 0: door open (final state)
```

**Integration with `playActorAnimation` action:**

The `playActorAnimation` action type (already defined in ActionType) triggers a named animation state on a specific actor entity. Parameters: `{ actorId: string, animation: string }`. The animation string maps to a state name (e.g., "interact", "emote-surprise"). The actor's state machine transitions to that state, plays the animation once, then returns to IDLE.

### 6. Spritesheet Format and Naming

**Spritesheet definition (JSON, lives alongside the PNG):**

```json
{
  "id": "player-jack",
  "image": "player-jack.png",
  "cellWidth": 16,
  "cellHeight": 24,
  "columns": 4,
  "states": {
    "idle-down":  { "row": 0, "frames": 1, "fps": 2, "loop": true },
    "walk-down":  { "row": 1, "frames": 4, "fps": 8, "loop": true },
    "idle-up":    { "row": 2, "frames": 1, "fps": 2, "loop": true },
    "walk-up":    { "row": 3, "frames": 4, "fps": 8, "loop": true },
    "idle-left":  { "row": 4, "frames": 1, "fps": 2, "loop": true },
    "walk-left":  { "row": 5, "frames": 4, "fps": 8, "loop": true },
    "idle-right": { "row": 6, "frames": 1, "fps": 2, "loop": true, "flipX": true, "sourceState": "idle-left" },
    "walk-right": { "row": 7, "frames": 4, "fps": 8, "loop": true, "flipX": true, "sourceState": "walk-left" },
    "interact":   { "row": 8, "frames": 3, "fps": 6, "loop": false },
    "emote":      { "row": 9, "frames": 4, "fps": 8, "loop": false },
    "hurt":       { "row": 10, "frames": 2, "fps": 6, "loop": false }
  }
}
```

When `flipX` is true and `sourceState` is provided, the row may be omitted from the PNG entirely. The renderer reads the source row and flips horizontally. This saves atlas space.

**Naming conventions:**

- State names: `{action}-{direction}` for directional states. Examples: `walk-down`, `idle-up`, `walk-left`.
- Direction-agnostic states: just the action name. Examples: `interact`, `emote`, `hurt`.
- Custom states: `custom-{name}`. Examples: `custom-fishing`, `custom-reading`. Always document in the spritesheet JSON.
- Emote variants: `emote-{emotion}`. Examples: `emote-surprise`, `emote-joy`, `emote-sad`.
- File names: `{actorType}-{characterName}.png` and `.json`. Examples: `player-jack.png`, `npc-hermit.png`, `prop-chest.png`.

### 7. Frame Budget and Performance

**Per-actor atlas cost:**

| Sheet Type              | Cells   | Cell Size | PNG Dimensions  | Raw Size | Compressed (PNG) |
|-------------------------|---------|-----------|-----------------|----------|-------------------|
| Full character (11 rows)| 11 x 4 = 44 | 16x24 | 64x264 px       | ~4 KB    | ~1.5-2.5 KB       |
| Min character (8 rows)  | 8 x 4 = 32  | 16x24 | 64x192 px       | ~3 KB    | ~1-2 KB            |
| Minor NPC (4 rows)      | 4 x 2 = 8   | 16x16 | 32x64 px        | ~0.5 KB  | ~0.3-0.5 KB       |
| Large actor (8 rows)    | 8 x 4 = 32  | 32x32 | 128x256 px      | ~16 KB   | ~4-8 KB            |

**GPU texture cost (RGBA, power-of-two padded):**

- Full character: padded to 64x512 = 128 KB VRAM.
- Minor NPC: padded to 32x64 = 8 KB VRAM.
- Large actor: padded to 128x256 = 128 KB VRAM.

**Per-actor memory budget: 256 KB maximum** (from performance-budget.md: "Sprite atlas per actor <= 256 KB"). All character sheets fit well within this.

**Screen budget:**

| Metric                       | Desktop | Low-end Mobile |
|------------------------------|---------|----------------|
| Max animated actors on screen| 12      | 8              |
| Max total sprites (tiles+actors+UI) | 300 | 150          |
| Target actor draw calls      | <= 20   | <= 12          |

Typical card: 1 player + 3-5 NPCs + 2-3 animated props = 6-9 animated actors. Well within budget.

**Animation tick cost:**

The Actor.updateAnimation method runs per-actor per logic tick (60 Hz). Cost: one addition, one division, one modulo. At 12 actors this is negligible. The state machine transition check adds one branch per actor per tick.

**Tile animation budget:**

- Max animated tile definitions per tileset: 32 (each with up to 8 frames).
- Max group animations per card: 8.
- Max frames per group animation across all phases: 16.

These limits keep the per-frame overlay map rebuild in `Tilemap.updateAnimations` under 0.1 ms on low-end mobile.

### 8. Audio Sync Points

Animations expose named sync events at specific frame indices for the Audio Director to hook:

- `walk-down` frame 1 and frame 3: `footstep` event.
- `interact` frame 1: `impact` event (pick-up, push, pull).
- `door-opening` frame 2: `creak` event.
- `bookcase-turning` phase 1 frame 1: `scrape` event; phase 2 frame 1: `dust` event.
- `chest-opening` frame 1: `unlatch` event.

Sync points are defined in the spritesheet JSON under each state as `syncPoints: [{ frame: number, event: string }]`. The engine fires these as events on the global event bus when the animation reaches that frame. The audio system subscribes and plays the corresponding SFX.

### 9. Compatibility with Existing Tile Animation System

Character sprite animations and tile animations are **separate systems** that coexist:

- **Tile animations** (torch, water): driven by `Tilemap.updateAnimations()` using `AnimationPhase` / `TileAnimation`. Per-tile, per-cell. Already working.
- **Group animations** (bookcase, door): driven by `Tilemap.updateAnimations()` using `GroupAnimationPhase`. Multi-tile regions. Already working.
- **Actor animations** (player, NPC walk/idle/interact): driven by `Actor.updateAnimation()` per-actor. Uses spritesheet definitions, not tile IDs.

The renderer dispatches to the correct system based on what it is drawing: `drawTilemap` resolves tile and group animations; `drawActor` resolves actor spritesheet frames.

No changes to the tile animation system are required. The actor animation system extends Actor with a state machine and spritesheet reference. The `playActorAnimation` action type bridges the two: it tells an actor to play a named state, which the actor state machine handles.

## Audio Direction *(Audio Director)*
- Short loopable stems with procedural variation over long baked tracks.
- Music + SFX budgeted for size and decode cost.
- Graceful degradation on low-end mobile (bitrate fallbacks, muted mode).

## Writing Direction *(Design Leader)*
- Dialogue under 3 lines per bubble.
- Every line reveals character or advances the beat. Cut the rest.
- Choices reflect character, not stats.

## Media Extensibility
- **Current media:** pixel sprites, tile maps, audio stems, SFX.
- **Future media:** video sequences, animated backgrounds, rich media triggers.
- Data schemas include a `mediaType` field from day one. Media triggers use a `type + payload` pattern so new media types slot in without schema-breaking changes.
- Implementation of future types is deferred past M4; the schemas accommodate them now.

## AI Companion Character *(Roadmap, M7+)*

Every episode features a **partner character** — a companion with their own personality and point of view.

- **Without API key:** Companion follows scripted dialogue trees authored in Game Design Studio. Part of the normal adventure.
- **With API key (BYOK):** Player provides their own LLM API key. The companion comes to life — improvising, personalizing, referencing the player's history — but **always stays in character** and guides the player like a personified help system.
- **Example (X-Files):** Player is Mulder. Scully is the companion. Without key: "Mulder, I found something in the lab." With key: "You showed the compass to the hermit? That was reckless — but it might explain the signal we picked up near the lighthouse."
- **Core narrative unchanged.** The companion adds texture to interactions, not new branching paths or card unlocks.
- **Guardrails:** system prompt enforces character voice, no spoilers, no 4th-wall breaks, ≤3 lines per response.

See [`wiki/ai-companion.md`](wiki/ai-companion.md) for architecture, guardrails, and timeline.

## Reference Library
See [`sprints/sprint-01.md`](sprints/sprint-01.md) research section.
