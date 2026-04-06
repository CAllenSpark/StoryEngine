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
- Prefer fewer, more expressive frames.
- Animation must not block input or pace.
- Frame budgets per actor documented in production.

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

## Reference Library
See [`sprints/sprint-01.md`](sprints/sprint-01.md) research section.
