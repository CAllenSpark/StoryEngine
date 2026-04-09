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

## Sprite Animation System (UX Spec — owned by UI/UX Designer)

### Overview

The Sprite Animation System enables creators to import character spritesheets, define animation states (walk, idle, talk, etc.), assign them to the player character and NPCs, and build multi-step event sequences that chain tile, sprite, and dialogue animations together. All authoring happens inside the existing Tile Creator Studio editor with no mode-switching required for the core flows.

### F-SAS-1 Spritesheet Import and Animation Definition

**What it does:** The creator imports a character spritesheet image, defines a grid over it, and labels regions of the grid as named animation states (e.g., walk-down, idle, attack).

**Where it lives:** A new **Sprite Library** accordion section in the right panel, below CollectionPanel and above TilesetLibrary. This section is visible in both Art Mode and Game Mode because sprite assets are cross-cutting. The import flow itself uses a modal dialog consistent with the existing ImportDialog and AnimationDialog patterns.

**UI components:**

- **Sprite Library section (right panel):** A collapsible panel header labeled "Sprite Library" with an "Import Spritesheet" button. Below the button, a vertical list of imported sprite sets, each showing a small thumbnail (the first frame of the first animation state), the sprite set name, and a count of defined states. Each entry has an "edit" button and a "delete" button (minimum 44px touch targets on both).

- **SpritesheetImportDialog (modal):** Triggered by "Import Spritesheet." Follows the same fixed-overlay + centered-card pattern as AnimationDialog and ImportDialog.

  - **Step 1 — Load and Grid.** The creator selects a PNG/WebP file. The dialog displays the full spritesheet image at a comfortable zoom. Below the image: frame width and frame height number inputs (defaulting to 16x16, matching the tile size). The dialog draws a grid overlay on the image so the creator can verify alignment. If the image dimensions do not divide evenly by the chosen frame size, a yellow warning appears: "Image is [W]x[H] — does not divide evenly into [fw]x[fh] frames. [N] partial cells will be ignored." Auto-detection: if the image dimensions suggest common frame sizes (16, 24, 32, 48, 64), offer those as quick-pick buttons similar to the existing ImportDialog tile-size detection.

  - **Step 2 — Define States.** Below the gridded spritesheet preview, a "States" section. The creator clicks "Add State" to create a named animation state. Each state row contains:
    - A text input for the state name (pre-populated suggestions appear as ghost text: "walk-down", "walk-up", "walk-left", "walk-right", "idle-down", "idle-up", "talk", "hurt"). The creator can type any name.
    - A "frames" area showing small numbered thumbnails of the selected cells.
    - To assign frames: the creator clicks cells on the spritesheet grid above. Clicked cells highlight in the state's assigned color and their frame thumbnail appears in the state's frame strip. Clicking an already-assigned cell removes it. Each state gets a distinct highlight color from a colorblind-safe rotation (blue, orange, green, purple, cyan, red — all distinguishable in deuteranopia/protanopia simulations).
    - Speed slider (1-12 fps), same control as existing AnimationDialog.
    - Loop checkbox (default: on for walk/idle states, off for one-shot states like "hurt").
    - A drag handle on each frame thumbnail to reorder frames within the state.
    - A remove button on each state row.

  - **Preview area:** Top-right of the dialog, a 64x64px (4x zoom) canvas shows the currently-selected state playing back in real time. A dropdown above the preview selects which state to preview. Below the preview: facing direction buttons (down, up, left, right) if the creator has defined directional variants, so they can verify each direction.

  - **Step 3 — Name and Save.** A text input at the top for the sprite set name (e.g., "Merchant", "Player", "Guard"). Defaults to the filename. "Save" button (primary), "Cancel" button.

  - **Budget validation:** On save, the dialog checks the spritesheet image size against the 256 KB per-actor sprite atlas budget. If over budget, a red error blocks save and explains: "Spritesheet is [size] — exceeds 256 KB budget. Reduce frame count or image resolution." This is not a soft warning; it is a hard gate matching the perf budget enforcement philosophy.

**Key interactions (happy path):**
1. Creator clicks "Import Spritesheet" in the Sprite Library section.
2. File picker opens; they select "merchant.png".
3. Dialog shows the spritesheet with a 16x16 grid. Creator adjusts to 24x24 using quick-pick buttons. Grid re-draws.
4. Creator clicks "Add State", types "walk-down". Clicks 4 cells in the bottom row of the spritesheet. Four thumbnails appear in the state's frame strip.
5. Creator clicks "Add State", types "idle-down". Clicks 1 cell. Sets loop on.
6. Repeats for walk-up, walk-left, walk-right, idle.
7. Selects "walk-down" in the preview dropdown. Watches the 4-frame walk cycle play at 8fps. Adjusts speed to 6fps.
8. Names the sprite set "Merchant" and clicks Save.
9. "Merchant" appears in the Sprite Library list with a thumbnail.

**Accessibility:**
- All grid cells are keyboard-navigable (arrow keys to move focus, Space/Enter to toggle selection).
- State list items are announced by screen readers: "[state name], [N] frames, [speed] fps, loop [on/off]".
- Speed sliders have aria-label and aria-valuetext.
- Color coding of state regions on the spritesheet is supplemented with small text labels ("W-D", "I", "W-U") drawn on each assigned cell so the information is not color-only.

### F-SAS-2 Sprite Animation Assignment to Entities

**What it does:** The creator assigns an imported sprite animation set to the player character (spawn entity) or to an NPC entity, replacing the default colored-square rendering with actual animated sprites.

**Where it lives:** Inline within the existing EntityPanel. No new panel needed. Assignment controls appear when editing a spawn or NPC entity.

**UI components:**

- **Spawn entity row (EntityPanel):** When a spawn point exists, its row in the EntityPanel gains a "Sprite:" label followed by either the assigned sprite set name (as a clickable chip) or "None — assign sprite" (as a button). Clicking opens a **SpritePicker popover**: a small dropdown anchored to the button showing all imported sprite sets from the Sprite Library as a vertical list, each with thumbnail + name. Selecting one assigns it. A "Clear" option removes the assignment.

- **NPC entity row (EntityPanel) and NpcEditor dialog:** Same SpritePicker control. In the NpcEditor dialog, a "Sprite" field appears above the "Dialogue Lines" section. Same popover pattern.

- **Canvas preview:** When an entity has an assigned sprite set, the EditorCanvas renders that entity using the sprite set's idle-down frame (or the first frame of the first defined state) instead of the current colored marker. In Game Mode, the entity shows its idle animation playing. In Art Mode, it shows a static first frame to avoid visual distraction during tile painting.

**Key interactions (happy path):**
1. Creator places an NPC at (5, 3) using the NPC tool in Game Mode.
2. In the EntityPanel, they click "edit" on the new NPC.
3. NpcEditor dialog opens. They set the name to "Merchant".
4. They click "None — assign sprite" in the Sprite field.
5. SpritePicker popover shows: [Merchant thumbnail] Merchant, [Guard thumbnail] Guard.
6. They select "Merchant". The field now shows "Merchant" as a chip.
7. They add dialogue lines and click Save.
8. Back on the canvas, the NPC at (5,3) now displays the Merchant's idle sprite instead of a yellow square.

**Data model (for Frontend Engineer):**
- `EntityDef.properties` gains an optional `spriteSetId: string` field referencing a sprite set stored in the Sprite Library (IndexedDB, same pattern as tileset library and animation library).
- The `SceneJSON` does not embed sprite image data; it references sprite sets by ID. The export pipeline resolves these references and packs the required sprite atlases.

### F-SAS-3 Event Sequence Builder (Multi-Step Event Animations)

**What it does:** The creator builds a multi-step event animation sequence — for example, "player interacts with bookcase, bookcase rotates (group animation), passage is revealed (tile change), NPC walks out (sprite animation), dialogue plays." This extends the existing ActionEditor with richer sequencing controls.

**Where it lives:** Inside the existing ActionEditor dialog. No new top-level UI surface. The ActionEditor already supports multi-step action sequences with types like showDialogue, playGroupAnimation, changeScene, etc. This feature enhances it with sequencing controls, the new playActorAnimation type (currently a stub), and a timeline preview.

**UI components:**

- **Enhanced ActionEditor step list:** Each step now shows a sequence number and a visual connector line between steps (a thin vertical line on the left margin of the step list, with dots at each step — a miniature vertical timeline). Steps still execute in top-to-bottom order.

- **Parallel group markers:** A new "Run with previous" checkbox on each step (except the first). When checked, the step executes simultaneously with the step above it, and the visual connector shows a horizontal fork instead of a vertical continuation. This lets creators say "play the bookcase animation AND play a sound effect at the same time."

- **Wait/delay step type:** A new action type "Wait" added to the step menu. Params: duration in milliseconds (number input with a slider, 100ms-5000ms range). Allows pacing between steps: "bookcase animates... wait 500ms... NPC walks out."

- **playActorAnimation step (promoted from stub):** Now fully functional. Params:
  - Actor selector: a dropdown listing all NPC entities in the current scene by name. Also includes "Player" if a spawn point exists.
  - Animation state selector: once an actor is selected, a second dropdown lists all animation states defined in that actor's assigned sprite set. If no sprite set is assigned, a yellow hint says "Assign a sprite set to this actor first."
  - Optional: "Move to" fields (target X, Y in tile coordinates). If set, the actor physically moves to that position while playing the animation. Speed uses the actor's default movement speed.

- **Sequence preview button:** At the top of the ActionEditor, a "Preview Sequence" button. Clicking it:
  1. Sends the current step list to the WYSIWYG preview iframe via postMessage.
  2. The preview plays through the sequence in real time: group animations fire, actors move and animate, dialogue boxes appear, waits pause appropriately.
  3. A small "Stop Preview" button replaces the "Preview Sequence" button during playback.
  4. Preview does not modify scene data; it is read-only playback.

**Key interactions (happy path — bookcase puzzle):**
1. Creator has already: painted a bookcase tile group, created a group animation showing the bookcase sliding open, and imported a "Hermit" sprite set assigned to an NPC behind the bookcase.
2. Creator places an Action entity on the bookcase tile. Opens ActionEditor.
3. Sets trigger to "interact".
4. Adds step: "Show Dialogue" with line "Hermit: *creak*".
5. Adds step: "Play Group Animation" and selects "Bookcase Open" from the dropdown.
6. Adds step: "Wait" — sets to 800ms.
7. Adds step: "Play Actor Animation" — selects "Hermit", state "walk-down", move-to (5, 7).
8. Adds step: "Show Dialogue" with line "Hermit: Ah, visitors at last."
9. Checks "One-shot" so this sequence only fires once.
10. Clicks "Preview Sequence." The preview pane plays: dialogue appears, bookcase slides, pause, hermit walks out, second dialogue plays.
11. Clicks Save.

### F-SAS-4 Editor Layout Integration

**Where each new element lives in the existing layout:**

```
+---------------------------------------------------------------+
| [Art Mode] [Game Mode]                          Tab to switch  |
+---------------------------------------------------------------+
| Toolbar (Art) or GameToolbar (Game)                            |
+----------+---------------------------+------------------------+
|          |                           | LayerPanel (Art only)  |
| Tileset  |                           | CollectionPanel        |
| Panel    |      EditorCanvas         | PrefabPanel (Art only) |
| (Art     |                           | EntityPanel (Game only)|
|  only)   |                           |*Sprite Library* <-NEW  |
|          |                           | TilesetLibrary         |
+----------+---------------------------+------------------------+
| ExportBar                                                      |
+---------------------------------------------------------------+
```

- **Sprite Library** appears in the right panel, positioned between EntityPanel and TilesetLibrary. Visible in both modes because sprite assets are used during both tile authoring (seeing character scale relative to tiles) and game authoring (assigning sprites to entities).
- **SpritesheetImportDialog** is a modal, same as AnimationDialog / GroupAnimationDialog / ImportDialog / NpcEditor / ActionEditor. Overlays the entire editor.
- **SpritePicker** is an anchored popover (not a modal), consistent with how exit-zone target scene selectors currently work as inline dropdowns.
- **ActionEditor enhancements** (timeline, parallel steps, wait, playActorAnimation) are internal to the existing ActionEditor modal.
- No new toolbar buttons needed. Access points: Sprite Library section button for import, EntityPanel/NpcEditor for assignment, ActionEditor for sequencing.

### F-SAS-5 Animation Preview in Editor

**What it does:** Sprites assigned to entities animate live on the EditorCanvas, and the sequence preview plays in the WYSIWYG preview pane.

**Where it lives:** EditorCanvas (for idle preview) and PreviewPane iframe (for sequence preview).

**Behavior:**
- **Game Mode canvas:** Entities with assigned sprite sets render their idle animation at the entity's tile position. The animation ticks at the defined fps, using the same `resolvePhaseFrame` utility already used by tile animations. Walking animation does NOT play on the canvas (the entity is static in the editor); only idle plays.
- **Art Mode canvas:** Entities render as a static single frame (first frame of idle-down or first state). No animation ticking, to avoid distraction during tile painting.
- **Sequence preview:** When the creator clicks "Preview Sequence" in the ActionEditor, the full sequence plays in the PreviewPane iframe using the engine runtime's ActorSystem, which already supports `updateAnimation` and `updateFacing`. The preview pane receives the step list via postMessage and executes it using the same runtime code that will run in production.

### F-SAS-6 Shared Type Contracts (for Frontend Engineer)

New types to add to `packages/shared/src/types/scene.ts`:

```typescript
interface SpriteFrame {
  x: number;      // column in spritesheet grid
  y: number;      // row in spritesheet grid
}

interface SpriteAnimationState {
  name: string;           // e.g., "walk-down", "idle", "talk"
  frames: SpriteFrame[];  // ordered frames for this state
  speed: number;          // fps, 1-12
  loop: boolean;          // true = loop, false = play once and hold last frame
}

interface SpriteSet {
  id: string;
  name: string;             // e.g., "Merchant", "Player"
  image: string;            // filename reference (resolved at export)
  imageDataUrl?: string;    // data URL for editor preview (stripped at export)
  frameWidth: number;       // px
  frameHeight: number;      // px
  columns: number;          // grid columns in the spritesheet
  rows: number;             // grid rows in the spritesheet
  states: SpriteAnimationState[];
}
```

- `EntityDef.properties.spriteSetId?: string` — references a SpriteSet by id.
- `ActionType` union gains `'wait'` type. `ActionStep` for wait: `{ type: 'wait', params: { duration: number } }`.
- `ActionStep` for playActorAnimation gains full params: `{ actorId: string, animation: string, moveTo?: { x: number, y: number } }`.
- `ActionStep` gains optional `parallel?: boolean` field (default false). When true, executes concurrently with the previous step.

### F-SAS-7 Accessibility Baseline for Sprite Animation Features

- All buttons in the Sprite Library, SpritePicker, and SpritesheetImportDialog have minimum 44px touch targets.
- All interactive elements have visible focus indicators (2px solid outline in the existing #89b4fa blue).
- SpritesheetImportDialog grid cells are keyboard-navigable with arrow keys; selection state is announced via aria-pressed.
- Spritesheet state color coding uses a colorblind-safe palette AND redundant text labels on grid cells.
- Speed sliders have aria-label="Animation speed" and aria-valuetext="[N] frames per second".
- Modal dialogs trap focus and return focus to the triggering element on close (existing pattern in AnimationDialog).
- Sequence preview playback is announced: "Previewing sequence" on start, "Preview complete" on end (aria-live="polite" region).
- All sprite thumbnails in lists have alt text: "[Sprite set name] preview" for screen readers.

## Cross-Cutting
- All features ship with measurable perf impact (memory delta, frame time delta, bundle delta).
- No feature is considered complete until tested against the perf budget.
- **F-CC-1 Accessibility** — keyboard navigation fallback for all interactions, high-contrast mode, screen-reader friendly dialogue output, scalable text, colorblind-safe palettes.
- **F-CC-2 Input unification** — single input abstraction over mouse, touch, and keyboard with `preventDefault` handling and mobile gesture support (drag for map exploration if applicable).
- **F-CC-3 Scaling** — fixed 320×180 internal resolution with crisp integer scaling to any display size. Pixel-perfect rendering at all common viewport sizes.
- **F-CC-4 Graceful degradation** — missing assets show a placeholder sprite/sound + console warning (never crash); low memory triggers automatic effect reduction.
- **F-CC-5 Telemetry schema** — minimal event set defined at authoring time: `beat_completed`, `session_duration`, `adventure_completed`, `choice_made`. Schema locked before first production deploy. Privacy-respecting: no PII, no tracking across adventures, explicit opt-in where required.
