# Functional Requirements Document — StoryEngine

> Sprint 1 seed. Owner: UI/UX Designer (UX sections), PM (accountable). Expand every sprint.

Each feature lists a one-line acceptance criterion. Full specs land in later sprints as features approach implementation.

## Tile Creator Studio
- **F-TCS-1 Paint tiles onto a grid** — author can place/erase tiles on a 2D grid with a selected tileset.
- **F-TCS-2 Tileset import** — author can import a texture atlas + metadata and it appears as paintable tiles.
- **F-TCS-3 Layer support** — author can stack background/midground/foreground layers.
- **F-TCS-4 Export scene JSON** — tilemap exports to a stable schema consumable by the runtime.
- **F-TCS-5 Undo/redo** — at least 50 steps of undo without breaking perf budget.

## Game Design Studio
- **F-GDS-1 Place actors** — author can drop characters/props into a scene from the Tile Creator export.
- **F-GDS-2 Dialogue authoring** — author can write branching dialogue with conditions.
- **F-GDS-3 Trigger zones** — author can place interactable regions that fire events.
- **F-GDS-4 Beat sequencer** — author can order story beats and connect them into a 5-minute arc.
- **F-GDS-5 Export adventure bundle** — adventure exports as a single bundle under the size budget.
- **F-GDS-6 WYSIWYG preview** — studio renders a live preview pane using the same rendering path as the engine runtime; what the author sees is what the player gets.
- **F-GDS-7 Code export** — adventure publishes as an optimized runtime bundle (validated, tree-shaken, compiled, packaged), not just raw JSON for runtime interpretation.
- **F-GDS-8 Hot-reload preview** — changing any JSON or asset in the studio immediately reflects in the preview pane without manual refresh.
- **F-GDS-9 Multi-path narrative authoring** — visual graph editor for Inkle-style branching with card transitions, conditional branches, and inventory-gated paths.
- **F-GDS-10 Inventory/discovery authoring** — author defines items and their card-unlock relationships in the beat sequencer.

## Game Engine Runtime
- **F-ENG-1 Render tilemap + sprites at 60 FPS desktop / 30 FPS low-end mobile.**
- **F-ENG-2 Play audio** — music loops + SFX with adaptive rules.
- **F-ENG-3 Input** — mouse, keyboard, and touch, all with accessible focus states.
- **F-ENG-4 Dialogue system** — render branching dialogue from the authored schema.
- **F-ENG-5 Save/resume** — player can pause and return to the same beat.
- **F-ENG-6 Debug overlay** — toggleable via `?debug=perf` URL param: FPS counter, frame time, draw calls, memory. Additional overlays via `?debug=overlay`: tile grid, trigger zones, collision bounds, dialogue graph highlights, actor states.
- **F-ENG-7 Media trigger system** — extensible event system that fires sprites, audio, and (future) video/rich media from beat events. Uses a `type + payload` pattern.

## Player Shell (UX sections — owned by UI/UX Designer)
- **F-SHL-1 Library** — browse available micro-adventures with cover + duration + synopsis.
- **F-SHL-2 One-tap start** — zero-friction launch from library to first input.
- **F-SHL-3 Session timer** — diegetic hint that respects the 5-minute shape.
- **F-SHL-4 Accessibility** — keyboard nav, screen-reader labels, colorblind-safe palettes, scalable text.
- **F-SHL-5 Touch targets ≥ 44px** on mobile.
- **F-SHL-6 Library series structure** — episodes grouped by series with episode numbers, "New" badge on latest releases, completion status per episode.
- **F-SHL-7 Continue vs. New routing** — smart default: "Continue" resumes the last unfinished episode; "New" starts the next in sequence. Player can also browse freely.
- **F-SHL-8 Episode recap** — if a player hasn't played the previous episode, offer a brief text summary ("Previously on...") before starting. Authored per-episode by Design Leader.
- **F-SHL-9 Member status** — display free/member status. Single purchase flow for membership (one-time, unlocks everything). Free episodes marked clearly in library.

## Publishing *(PM + Backend Engineer)*
- **F-PUB-1 Content approval checklist** — in-studio checklist (session timer, dialogue limits, beat timing, asset completeness) + Design Leader sign-off gate before code export.
- **F-PUB-2 Publish to CDN** — POST /publish API: validate bundle, upload to CDN, update library manifest.
- **F-PUB-3 Rollback / unpublish** — PM can unpublish an episode or revert to a previous version via the publish API.
- **F-PUB-4 Library manifest update** — GET /library returns the current manifest; Player Shell fetches it once per session (cached via service worker).

## Game Engine Runtime (continued)
- **F-ENG-8 World state load/save** — on episode start, read `worldState.json` snapshot (chain model). On episode completion, write updated snapshot. See [`wiki/world-state.md`](wiki/world-state.md).
- **F-ENG-9 Starter state** — for mid-series players: load a curated `starterState.json` if no world state exists for the required episode.

## AI Companion *(Roadmap, M7+)*
- **F-AIC-1 BYOK API key input** — player enters their LLM API key in settings. Stored locally only; never sent to our servers.
- **F-AIC-2 LLM companion dialogue mode** — dialogue nodes tagged `ai_companion: true` use the player's API key to generate in-character responses when key is present.
- **F-AIC-3 Fallback to scripted dialogue** — if no API key or LLM call fails, silently render the authored scripted line. No degradation in core experience.

## Cross-Cutting
- All features ship with measurable perf impact (memory delta, frame time delta, bundle delta).
- No feature is considered complete until tested against the perf budget.
- **F-CC-1 Accessibility** — keyboard navigation fallback for all interactions, high-contrast mode, screen-reader friendly dialogue output, scalable text, colorblind-safe palettes.
- **F-CC-2 Input unification** — single input abstraction over mouse, touch, and keyboard with `preventDefault` handling and mobile gesture support (drag for map exploration if applicable).
- **F-CC-3 Scaling** — fixed 320×180 internal resolution with crisp integer scaling to any display size. Pixel-perfect rendering at all common viewport sizes.
- **F-CC-4 Graceful degradation** — missing assets show a placeholder sprite/sound + console warning (never crash); low memory triggers automatic effect reduction.
- **F-CC-5 Telemetry schema** — minimal event set defined at authoring time: `beat_completed`, `session_duration`, `adventure_completed`, `choice_made`. Schema locked before first production deploy. Privacy-respecting: no PII, no tracking across adventures, explicit opt-in where required.
