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

## Game Engine Runtime
- **F-ENG-1 Render tilemap + sprites at 60 FPS desktop / 30 FPS low-end mobile.**
- **F-ENG-2 Play audio** — music loops + SFX with adaptive rules.
- **F-ENG-3 Input** — mouse, keyboard, and touch, all with accessible focus states.
- **F-ENG-4 Dialogue system** — render branching dialogue from the authored schema.
- **F-ENG-5 Save/resume** — player can pause and return to the same beat.

## Player Shell (UX sections — owned by UI/UX Designer)
- **F-SHL-1 Library** — browse available micro-adventures with cover + duration + synopsis.
- **F-SHL-2 One-tap start** — zero-friction launch from library to first input.
- **F-SHL-3 Session timer** — diegetic hint that respects the 5-minute shape.
- **F-SHL-4 Accessibility** — keyboard nav, screen-reader labels, colorblind-safe palettes, scalable text.
- **F-SHL-5 Touch targets ≥ 44px** on mobile.

## Cross-Cutting
- All features ship with measurable perf impact (memory delta, frame time delta, bundle delta).
- No feature is considered complete until tested against the perf budget.
