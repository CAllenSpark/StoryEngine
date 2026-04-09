# Animation Authoring Checklist

> Owner: Animator. Reference: `docs/gdd.md` Animation Direction section.

This checklist is for anyone creating sprite animations for StoryEngine -- whether character walk cycles, NPC idle loops, or event animations like doors and bookcases.

## Before You Start

- [ ] Read the Animation Direction section of `docs/gdd.md` for sprite sizes, frame counts, and FPS targets.
- [ ] Confirm which actor type you are animating (player 16x24, NPC 16x24, minor NPC 16x16, large 32x32).
- [ ] Choose your palette from the biome palette set. All frames in a sheet use the same palette.
- [ ] Decide if this character can use the symmetric shortcut (left-facing only, engine flips for right).

## Spritesheet Production

### Layout

- [ ] PNG is organized as a grid: rows = states, columns = frames.
- [ ] Cell dimensions match the actor type exactly (no padding within cells).
- [ ] Row order follows the standard layout documented in the GDD.
- [ ] Idle frames are column 0 of their respective walk rows (idle-down = row 0 col 0, etc.).
- [ ] If using the symmetric shortcut, right-facing rows (6, 7) may be omitted from the PNG.

### Frame Counts

| State          | Required Frames | Maximum Frames |
|----------------|-----------------|----------------|
| idle (per dir) | 1               | 2              |
| walk (per dir) | 4               | 4              |
| interact       | 2               | 4              |
| emote          | 2               | 6              |
| hurt           | 2               | 3              |

- [ ] Walk cycle uses exactly 4 frames: stand, step-L, stand, step-R.
- [ ] No animation state exceeds 6 frames (fewer frames = more expressive = smaller atlas).
- [ ] One-shot animations (interact, emote, hurt) have a clear start and end pose.

### Pixel Art Quality

- [ ] Silhouette is readable at 1x (no zoom). Test by viewing the sheet at 320x180 in a browser.
- [ ] Character pivot is consistent: feet at the bottom of the cell, head at top.
- [ ] Walk cycle has no "floating" frames -- feet contact the ground plane at frames 0 and 2.
- [ ] Facing directions are distinguishable by silhouette alone (no relying on color only).
- [ ] No sub-pixel rendering. All pixels are solid, on-grid, integer positions.

## Spritesheet JSON Definition

- [ ] JSON file exists alongside the PNG with matching base name.
- [ ] `cellWidth` and `cellHeight` match the actual cell dimensions in the PNG.
- [ ] `columns` equals the maximum number of frames in any row.
- [ ] Every state used by the engine has an entry in `states`.
- [ ] `fps` values match the standard speeds from the GDD (walk=8, idle=2, interact=6, emote=8, hurt=6).
- [ ] `loop` is `true` for walk and idle, `false` for interact/emote/hurt.
- [ ] If using `flipX`, the `sourceState` field points to a valid state name.
- [ ] Custom states are prefixed with `custom-` and documented in a comment or README.

## Audio Sync Points

- [ ] Walk cycles define `footstep` sync at frames 1 and 3.
- [ ] Interact animations define an `impact` sync at the contact frame.
- [ ] Sync points are listed in the spritesheet JSON under `syncPoints` per state.
- [ ] Sync event names match the Audio Director's SFX naming (see audio docs when available).

## Event / Object Animations

Event animations (doors, bookcases, chests) use the group animation system in Tile Creator Studio.

- [ ] Event is authored as a GroupAnimation with defined (x, y, width, height) region.
- [ ] Phases are ordered: action phase(s) with `loops: N` followed by a hold phase with `loops: undefined`.
- [ ] The hold phase has exactly 1 frame showing the final resting state.
- [ ] Total frames across all phases does not exceed 16.
- [ ] Speed values are appropriate: slow events (bookcase) at 3 FPS, fast events (door) at 4 FPS.
- [ ] The `playGroupAnimation` action step references the correct `groupId`.

### Event Animation Phase Structure

```
Phase 1: Action  -- loops: 1, speed: 3-4, frames: 3-6
Phase 2: Settle  -- loops: 1, speed: 2-4, frames: 2-3 (optional, for multi-stage events)
Phase N: Hold    -- loops: undefined, speed: 1, frames: 1 (final state)
```

## Budget Verification

- [ ] PNG file size is under 256 KB (per-actor atlas budget from performance-budget.md).
- [ ] Full character sheet (11 rows x 4 cols, 16x24) is under 3 KB compressed PNG.
- [ ] Minor NPC sheet (4 rows x 2 cols, 16x16) is under 1 KB compressed PNG.
- [ ] No more than 12 animated actors expected on screen at once (8 on mobile).
- [ ] No more than 8 group animations per card.
- [ ] No more than 32 animated tile definitions per tileset.

## Integration Testing

- [ ] Load the spritesheet in Tile Creator Studio preview. Confirm all frames render correctly.
- [ ] Verify walk cycle at 8 FPS looks smooth and natural, not too fast or robotic.
- [ ] Verify idle animation (if multi-frame) is subtle -- breathing, not bouncing.
- [ ] Verify one-shot animations play once and return to idle cleanly.
- [ ] Verify symmetric flip (if used) produces correct right-facing sprites with no mirroring artifacts.
- [ ] Test on the `?debug=perf` overlay: confirm sprite count and frame time stay within budget.
- [ ] For event animations: trigger the action in playtest mode. Confirm phases chain correctly and the hold state persists.

## Naming Checklist

- [ ] PNG file: `{actorType}-{characterName}.png` (e.g., `player-jack.png`, `npc-hermit.png`).
- [ ] JSON file: `{actorType}-{characterName}.json` (matching the PNG).
- [ ] State names use `{action}-{direction}` format: `walk-down`, `idle-up`, `walk-left`.
- [ ] Direction-agnostic states use action only: `interact`, `emote`, `hurt`.
- [ ] Emote variants: `emote-{emotion}` (e.g., `emote-surprise`, `emote-joy`).
- [ ] Custom states: `custom-{name}` (e.g., `custom-fishing`, `custom-reading`).
- [ ] No spaces, no uppercase, no underscores in state or file names. Kebab-case only.

## Submission

- [ ] PNG and JSON are committed together in the same PR.
- [ ] PR description includes: actor type, cell dimensions, total frame count, compressed file size.
- [ ] If this is a new actor type or custom state, the GDD animation section has been updated.
- [ ] Animator has reviewed the sheet for motion quality (no rubber-banding, no pops, clean loops).
