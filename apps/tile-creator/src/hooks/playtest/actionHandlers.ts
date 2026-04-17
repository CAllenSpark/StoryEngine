import type { ActionDef, ActionStep, ActionType, DialogueLine } from '@storyengine/shared';
import type { PlaytestState } from './types.js';

/**
 * Check whether an action's condition is satisfied.
 * - No condition = always satisfied.
 * - `condition.flag = "foo"` passes only when `state.flags.foo` is truthy.
 * - `condition.item` is not yet implemented (returns true for now — inventory
 *   system is planned for a future sprint).
 */
export function canTriggerAction(action: ActionDef, state: PlaytestState): boolean {
  const cond = action.condition;
  if (!cond) return true;
  if (cond.flag && !state.flags[cond.flag]) return false;
  // TODO: inventory-based conditions when we have an inventory system.
  return true;
}

/**
 * Context passed to every step handler. Handlers read and mutate `state`,
 * and can request side effects via the context methods.
 */
export interface StepHandlerContext {
  state: PlaytestState;
  requestSceneChange: (sceneId: string, spawnX?: number, spawnY?: number) => void;
  /** Set a named animation state on an actor entity. Used by playActorAnimation. */
  setActorAnimation?: (entityId: string, stateName: string) => void;
}

/**
 * Step handler return value:
 * - `continue`: execute the next step in the action sequence
 * - `halt`:     stop processing further steps (e.g. after a scene change)
 */
export type StepHandlerResult = 'continue' | 'halt';

/** A pure function that processes one action step. */
export type StepHandler = (step: ActionStep, ctx: StepHandlerContext) => StepHandlerResult;

// ── Individual step handlers ────────────────────────────────────────
// Each handler is pure: it reads `step.params` and mutates `ctx.state`.
// Extracted so they can be unit-tested without React or canvas.

const showDialogue: StepHandler = (step, { state }) => {
  const lines = step.params.lines as DialogueLine[] | undefined;
  if (lines && lines.length > 0) {
    state.dialogue = lines;
    state.dialogueIndex = 0;
  }
  return 'continue';
};

const changeScene: StepHandler = (step, { requestSceneChange }) => {
  const targetSceneId = step.params.targetSceneId as string;
  const sx = (step.params.spawnX as number) ?? 0;
  const sy = (step.params.spawnY as number) ?? 0;
  if (targetSceneId) requestSceneChange(targetSceneId, sx, sy);
  // Halt: scene change invalidates the rest of the sequence for this scene.
  return 'halt';
};

const changePlayerState: StepHandler = (step, { state }) => {
  const flag = step.params.flag as string;
  const value = step.params.value;
  if (flag) state.flags[flag] = value;
  return 'continue';
};

const playVideo: StepHandler = (step, { state }) => {
  state.media = {
    type: 'video',
    url: step.params.url as string,
    startedAt: Date.now(),
  };
  return 'continue';
};

const playAudio: StepHandler = (step, { state }) => {
  state.audio = {
    url: step.params.url as string,
    loop: (step.params.loop as boolean) ?? false,
  };
  return 'continue';
};

const stopAudio: StepHandler = (_step, { state }) => {
  state.audio = null;
  return 'continue';
};

const showImage: StepHandler = (step, { state }) => {
  state.media = {
    type: 'image',
    url: step.params.url as string,
    duration: (step.params.duration as number) ?? 3000,
    startedAt: Date.now(),
  };
  return 'continue';
};

const showSlideshow: StepHandler = (step, { state }) => {
  state.media = {
    type: 'slideshow',
    urls: (step.params.images as string[]) ?? [],
    interval: (step.params.interval as number) ?? 2000,
    startedAt: Date.now(),
  };
  return 'continue';
};

const playerInput: StepHandler = (step, { state }) => {
  state.media = {
    type: 'playerInput',
    prompt: (step.params.prompt as string) ?? 'What do you do?',
    options: (step.params.options as string[]) ?? [],
    startedAt: Date.now(),
  };
  return 'continue';
};

/** Group animations play automatically via the tilemap — no runtime action needed. */
const playGroupAnimation: StepHandler = () => 'continue';

/** Trigger a named animation state on a specific actor (e.g. 'interact', 'emote'). */
const playActorAnimation: StepHandler = (step, { setActorAnimation }) => {
  const entityId = step.params.entityId as string;
  const stateName = step.params.stateName as string;
  if (entityId && stateName && setActorAnimation) {
    setActorAnimation(entityId, stateName);
  }
  return 'continue';
};

/** Ends the adventure — shows the resolution card. Halts further steps. */
const endAdventure: StepHandler = (step, { state }) => {
  state.ended = true;
  state.endMessage = (step.params.message as string | undefined) ?? null;
  return 'halt';
};

/**
 * Central registry mapping ActionType to its handler.
 * To add a new action type: add a case to the ActionType union in shared
 * types and add an entry here. No switch-statement edits anywhere else.
 */
export const STEP_HANDLERS: Record<ActionType, StepHandler> = {
  showDialogue,
  changeScene,
  changePlayerState,
  playVideo,
  playAudio,
  stopAudio,
  showImage,
  showSlideshow,
  playerInput,
  playGroupAnimation,
  playActorAnimation,
  endAdventure,
};

/**
 * Execute a full step sequence against the given context.
 * Stops early on `halt` (e.g. scene change).
 */
export function runActionSteps(steps: ActionStep[], ctx: StepHandlerContext): void {
  for (const step of steps) {
    const handler = STEP_HANDLERS[step.type];
    if (!handler) continue;
    if (handler(step, ctx) === 'halt') return;
  }
}
