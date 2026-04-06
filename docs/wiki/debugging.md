# Debugging & Developer Tools

> Sprint 1.5 seed. Owner: Frontend Engineer. See also: [`performance-budget.md`](performance-budget.md), [TDD debugging section](../tdd.md).

## Enabling Debug Mode

Debug features are **zero-cost when disabled** — no DOM elements, no event listeners, no hot-path allocations.

| Method | Scope | Example |
|---|---|---|
| URL param | Per-session | `?debug=true` (all), `?debug=perf` (perf only), `?debug=overlay` (visual only) |
| localStorage | Persistent | `localStorage.setItem('SE_DEBUG', '1')` |
| Env variable | Dev builds | `STORYENGINE_DEBUG=1` at build time |

Combine flags: `?debug=perf,overlay`.

## Performance Overlay (`?debug=perf`)

Displays in a toggleable HUD corner:
- **FPS** (frames per second, rolling 1 s average)
- **Frame time** (ms, current + p95 over last 5 s)
- **Draw calls** (per frame, from renderer stats)
- **Sprite count** (on-screen tiles + actors + UI elements)
- **Memory estimate** (`performance.memory` where available, `navigator.deviceMemory` as static hint)

Implementation uses `performance.now()` around the render loop. No third-party profiling library required.

## Visual Overlays (`?debug=overlay`)

Each overlay can be toggled independently via the console or a debug panel:
- **Tile grid** — lines showing the tile boundaries on the current card.
- **Trigger zones** — semi-transparent colored rectangles over each trigger area, labeled with the trigger ID.
- **Collision bounds** — outlines around any collision-relevant geometry (even if no physics — useful for click/tap target verification).
- **Dialogue graph highlights** — active dialogue node highlighted; edges to next possible nodes shown.
- **Actor state labels** — floating labels above each actor showing current animation state and facing direction.

## Console API — `StoryEngine.debug`

Exposed as a global object in debug mode. **Not available in production builds.**

```js
StoryEngine.debug.jumpToBeat(id)      // Skip to any beat in the current adventure
StoryEngine.debug.skipDialogue()      // Auto-advance current dialogue to completion
StoryEngine.debug.reloadAdventure()   // Hot-reload the current adventure bundle
StoryEngine.debug.pauseBeats()        // Freeze beat progression
StoryEngine.debug.stepBeat()          // Advance exactly one beat (while paused)
StoryEngine.debug.resumeBeats()       // Resume normal beat flow
StoryEngine.debug.listBeats()         // Dump the beat graph to console (id, type, connections)
StoryEngine.debug.getState()          // Return current state: card, beat, inventory, flags
StoryEngine.debug.setFlag(key, value) // Manually set a game state flag for testing
StoryEngine.debug.listCards()         // Dump all cards and their unlock conditions
StoryEngine.debug.unlockCard(id)      // Force-unlock a card (bypass inventory gate)
```

## Hot-Reload in Studios

During WYSIWYG preview, the studio pushes changes to the embedded runtime iframe via `postMessage`:
- **On save:** full adventure.json delta sent; preview applies without page reload.
- **On asset change:** modified atlas/audio re-fetched; preview updates affected sprites/sounds.
- **Manual reload:** keyboard shortcut (e.g. `Ctrl+Shift+R`) forces a full preview reload.
- **Known limitation:** hot-reload does not restore beat/dialogue state. After reload, preview resets to the current card's initial state.

## WebGL Inspection (Spector.js)

If using PixiJS or another WebGL renderer:
1. Install Spector.js browser extension.
2. Capture a frame during gameplay.
3. Inspect: draw call count, texture uploads per frame, shader switches, overdraw.
4. Target: < 50 draw calls per frame for a typical card with 150–200 sprites.

PixiJS also exposes built-in stats via `app.renderer.plugins.batch` — log these in the perf overlay.

## Schema Validation

On adventure load, both `scene.json` and `adventure.json` are validated against their schemas:
- **Batch errors:** all validation errors surfaced at once (not fail-fast), each with JSON path and expected type.
- **Clear messages:** e.g. `adventure.json $.beats[3].trigger: expected string (trigger ID), got null. Did you forget to assign a trigger to this beat?`
- **Missing asset refs:** detected at validation time, not at render time. Missing assets → placeholder + warning.
- **Studio integration:** validation runs continuously in the studio as the author edits, with inline error markers.

## JSON Version Diffing

- Studio supports comparing any two saved versions of `adventure.json`.
- Diff view highlights: added/removed beats, changed dialogue, modified trigger conditions, inventory/card-unlock changes.
- Useful for reviewing changes before code export and for debugging unexpected behavior.
