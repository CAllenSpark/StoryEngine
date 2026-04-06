# World State — Episodic Snapshot Model

> Sprint 1.5 seed. Owner: Frontend Engineer. See also: [TDD](../tdd.md), [GDD](../gdd.md).

## Concept

Episodes act in **isolation**. Each episode reads a **world state snapshot** on start and writes an updated snapshot on completion. There is no "live" cross-episode state — just a simple ordered chain.

```
Episode 1 start → (empty world state)
Episode 1 end   → worldState v1 (compass collected, beach discovered)
Episode 2 start → reads worldState v1
Episode 2 end   → worldState v2 (compass, map collected; beach, cove discovered; hermit trusted)
Episode 3 start → reads worldState v2
...
```

The world grows **episodically**, not continuously. Each episode is a self-contained 5-minute experience that inherits context from the chain.

## Schema

```json
{
  "schemaVersion": 2,
  "episodeCompleted": 2,
  "inventory": [
    { "id": "compass", "episodeCollected": 1 },
    { "id": "map", "episodeCollected": 2 }
  ],
  "discoveredLocations": ["island", "beach", "cove"],
  "characterFlags": {
    "trusts_hermit": true,
    "knows_lighthouse_exists": false,
    "hermit_trust_level": 0.7
  },
  "worldFlags": {
    "storm_passed": true,
    "radio_tower_active": false
  }
}
```

**Design rules:**
- Inventory items are **narrative keys** (not stats). They gate card access and dialogue options.
- Character flags track relationship state and knowledge.
- World flags track environmental/plot state.
- All fields are optional with sensible defaults — episodes degrade gracefully if a flag is missing.

## Condition Language

Adventures reference world state via a simple condition system. **No nested logic.** Complex conditions should be broken into multiple beats (respects the 5-minute constraint).

### Supported conditions

**Flag check (boolean):**
```json
{ "flag": "trusts_hermit", "op": "==", "value": true }
```

**Flag check (numeric comparison):**
```json
{ "flag": "hermit_trust_level", "op": ">=", "value": 0.5 }
```

**Inventory check (item exists):**
```json
{ "inventory": "compass" }
```

**Episode progress check:**
```json
{ "episodeCompleted": { "op": ">=", "value": 3 } }
```

**Location discovered check:**
```json
{ "location": "cove" }
```

### Operators
`==`, `!=`, `>`, `<`, `>=`, `<=`. That's it. No `AND`/`OR` combinators at the condition level — use multiple beat gates if you need complex logic.

### Where conditions are used
- **Dialogue branches:** show/hide dialogue options based on world state.
- **Card access:** gate a card/location behind a condition (e.g., `{ "inventory": "compass" }` to access the Cove).
- **Beat triggers:** fire a beat only if a condition is met.
- **Actor visibility:** show/hide an actor in a card based on world state.

## Starter State

Players joining mid-series get a **curated starter snapshot** so they aren't locked out of content.

Each episode can define a `starterState.json` — the minimum world state needed to play that episode without having played previous ones. This is hand-authored by the Design Leader, not auto-generated.

**Example (starter for Episode 5):**
```json
{
  "schemaVersion": 2,
  "episodeCompleted": 4,
  "inventory": [
    { "id": "compass", "episodeCollected": 1 },
    { "id": "map", "episodeCollected": 2 },
    { "id": "radio_key", "episodeCollected": 4 }
  ],
  "discoveredLocations": ["island", "beach", "cove", "lighthouse"],
  "characterFlags": {
    "trusts_hermit": true,
    "knows_lighthouse_exists": true
  },
  "worldFlags": {
    "storm_passed": true,
    "radio_tower_active": true
  }
}
```

**Player Shell behavior:**
- If player has a world state from Episode 4 → use it (normal chain).
- If player has no world state (new player starting at Episode 5) → offer starter state + brief text recap ("Previously on...").
- Player can always go back and play earlier episodes; their world state updates to reflect the completed chain.

## Storage

- **Local:** `worldState.json` persisted in IndexedDB via localForage. Offline-first.
- **Member sync:** Members (paid) can optionally sync world state to the cloud for cross-device play. Free players are local-only.
- **Backup:** On episode completion, the previous world state is archived (one level of undo) in case the player wants to replay.

## Migration

When new episodes introduce new world state fields:

1. `schemaVersion` increments.
2. Episode N's loader checks the snapshot's `schemaVersion`.
3. If older, apply **forward migrations** (add missing fields with defaults).
4. Migrations are deterministic and idempotent — safe to run multiple times.
5. Migrations are co-owned by Frontend Engineer + Tester.

**Example migration (v1 → v2):**
```
if schemaVersion < 2:
  add worldFlags.radio_tower_active = false
  set schemaVersion = 2
```

## Relationship to adventure.json

- `adventure.json` defines **conditions** that reference world state fields.
- `adventure.json` defines **actions** that modify world state on beat completion:
  - `{ "action": "addInventory", "item": "compass" }`
  - `{ "action": "setFlag", "flag": "trusts_hermit", "value": true }`
  - `{ "action": "discoverLocation", "location": "cove" }`
- The engine runtime reads world state on adventure load and writes the updated snapshot on adventure completion.
- The code export pipeline validates that all conditions in `adventure.json` reference fields that exist in the world state schema.
