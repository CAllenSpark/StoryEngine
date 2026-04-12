import type { SpriteSheetDef, SpriteAnimState } from '@storyengine/shared';

/** Sprite sheet loaded for runtime rendering. */
export interface LoadedSpriteSheet {
  def: SpriteSheetDef;
  image: HTMLImageElement;
  stateMap: Map<string, SpriteAnimState>;
}

/** Per-actor animation runtime state. */
export interface ActorAnim {
  stateName: string;
  frame: number;
  accumMs: number;
}

/**
 * Build a LoadedSpriteSheet from raw storage data.
 * Starts image loading; callers should check `image.complete` before drawing.
 */
export function loadSpriteSheet(def: SpriteSheetDef, dataUrl: string): LoadedSpriteSheet {
  const image = new Image();
  image.src = dataUrl;
  const stateMap = new Map(def.states.map((s) => [s.name, s]));
  return { def, image, stateMap };
}

/**
 * Pick the best animation state name for an actor given movement and facing.
 * Tries the desired combo (walk-right), falls back to the opposite mode with
 * the same facing (idle-right), then to the sheet's defaultState.
 */
export function resolveActorState(
  sheet: LoadedSpriteSheet,
  facing: 'down' | 'up' | 'left' | 'right',
  isMoving: boolean,
): string {
  const prefix = isMoving ? 'walk' : 'idle';
  const desired = `${prefix}-${facing}`;
  if (sheet.stateMap.has(desired)) return desired;
  const alt = `${isMoving ? 'idle' : 'walk'}-${facing}`;
  if (sheet.stateMap.has(alt)) return alt;
  return sheet.def.defaultState;
}

/**
 * Advance the frame counter for an actor's current animation state.
 * Returns the (possibly new) ActorAnim record — create a fresh one on state change.
 * Mutates the ActorAnim in place; callers store it in a Map keyed by entity id.
 */
export function advanceActorAnim(
  current: ActorAnim | undefined,
  sheet: LoadedSpriteSheet,
  desiredState: string,
  dt: number,
): ActorAnim {
  let anim = current;
  if (!anim || anim.stateName !== desiredState) {
    anim = { stateName: desiredState, frame: 0, accumMs: 0 };
  }
  const state = sheet.stateMap.get(desiredState);
  if (!state || state.frameCount <= 1) return anim;
  anim.accumMs += dt;
  const frameDuration = 1000 / state.fps;
  while (anim.accumMs >= frameDuration) {
    anim.accumMs -= frameDuration;
    anim.frame++;
    if (anim.frame >= state.frameCount) {
      anim.frame = state.loop !== false ? 0 : state.frameCount - 1;
      if (state.loop === false) break;
    }
  }
  return anim;
}
