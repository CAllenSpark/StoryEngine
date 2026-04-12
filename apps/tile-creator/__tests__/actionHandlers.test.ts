import { describe, it, expect, beforeEach } from 'vitest';
import type { ActionStep } from '@storyengine/shared';
import { runActionSteps, STEP_HANDLERS, type StepHandlerContext } from '../src/hooks/playtest/actionHandlers.js';
import type { PlaytestState } from '../src/hooks/playtest/types.js';

function freshState(): PlaytestState {
  return {
    px: 0, py: 0, facing: 'down',
    sceneId: '', dialogue: null, dialogueIndex: 0,
    running: true, firedActions: new Set(), flags: {},
    media: null, audio: null, lastChoice: null,
  };
}

function makeCtx(state: PlaytestState = freshState()): {
  ctx: StepHandlerContext;
  sceneChanges: Array<[string, number | undefined, number | undefined]>;
} {
  const sceneChanges: Array<[string, number | undefined, number | undefined]> = [];
  const ctx: StepHandlerContext = {
    state,
    requestSceneChange: (id, sx, sy) => sceneChanges.push([id, sx, sy]),
  };
  return { ctx, sceneChanges };
}

describe('STEP_HANDLERS', () => {
  describe('showDialogue', () => {
    it('sets dialogue when lines are provided', () => {
      const state = freshState();
      const { ctx } = makeCtx(state);
      const step: ActionStep = {
        type: 'showDialogue',
        params: { lines: [{ speaker: 'Hero', text: 'Hello' }] },
      };
      const result = STEP_HANDLERS.showDialogue(step, ctx);
      expect(result).toBe('continue');
      expect(state.dialogue).toEqual([{ speaker: 'Hero', text: 'Hello' }]);
      expect(state.dialogueIndex).toBe(0);
    });

    it('is a no-op when lines are empty or missing', () => {
      const state = freshState();
      const { ctx } = makeCtx(state);
      STEP_HANDLERS.showDialogue({ type: 'showDialogue', params: {} }, ctx);
      expect(state.dialogue).toBeNull();
      STEP_HANDLERS.showDialogue({ type: 'showDialogue', params: { lines: [] } }, ctx);
      expect(state.dialogue).toBeNull();
    });
  });

  describe('changeScene', () => {
    it('requests scene change and halts further steps', () => {
      const { ctx, sceneChanges } = makeCtx();
      const result = STEP_HANDLERS.changeScene({
        type: 'changeScene',
        params: { targetSceneId: 'scene-2', spawnX: 5, spawnY: 3 },
      }, ctx);
      expect(result).toBe('halt');
      expect(sceneChanges).toEqual([['scene-2', 5, 3]]);
    });

    it('halts even when targetSceneId is missing', () => {
      const { ctx, sceneChanges } = makeCtx();
      const result = STEP_HANDLERS.changeScene({
        type: 'changeScene',
        params: {},
      }, ctx);
      expect(result).toBe('halt');
      expect(sceneChanges).toEqual([]);
    });
  });

  describe('changePlayerState', () => {
    it('sets flag to the provided value', () => {
      const state = freshState();
      const { ctx } = makeCtx(state);
      STEP_HANDLERS.changePlayerState({
        type: 'changePlayerState',
        params: { flag: 'hasKey', value: true },
      }, ctx);
      expect(state.flags.hasKey).toBe(true);
    });

    it('does nothing when flag is missing', () => {
      const state = freshState();
      const { ctx } = makeCtx(state);
      STEP_HANDLERS.changePlayerState({
        type: 'changePlayerState',
        params: { value: 42 },
      }, ctx);
      expect(state.flags).toEqual({});
    });
  });

  describe('playAudio / stopAudio', () => {
    it('playAudio sets audio with url and loop', () => {
      const state = freshState();
      const { ctx } = makeCtx(state);
      STEP_HANDLERS.playAudio({
        type: 'playAudio',
        params: { url: 'theme.mp3', loop: true },
      }, ctx);
      expect(state.audio).toEqual({ url: 'theme.mp3', loop: true });
    });

    it('playAudio defaults loop to false', () => {
      const state = freshState();
      const { ctx } = makeCtx(state);
      STEP_HANDLERS.playAudio({
        type: 'playAudio',
        params: { url: 'sfx.mp3' },
      }, ctx);
      expect(state.audio?.loop).toBe(false);
    });

    it('stopAudio clears audio without touching media', () => {
      const state = freshState();
      state.audio = { url: 'bg.mp3', loop: true };
      state.media = {
        type: 'image', url: 'x.png',
        duration: 1000, startedAt: Date.now(),
      };
      const { ctx } = makeCtx(state);
      STEP_HANDLERS.stopAudio({ type: 'stopAudio', params: {} }, ctx);
      expect(state.audio).toBeNull();
      expect(state.media).not.toBeNull();
    });
  });

  describe('showImage', () => {
    it('sets image overlay with default duration', () => {
      const state = freshState();
      const { ctx } = makeCtx(state);
      STEP_HANDLERS.showImage({
        type: 'showImage',
        params: { url: 'photo.png' },
      }, ctx);
      expect(state.media?.type).toBe('image');
      expect(state.media?.url).toBe('photo.png');
      expect(state.media?.duration).toBe(3000);
    });
  });

  describe('playerInput', () => {
    it('sets playerInput overlay with prompt and options', () => {
      const state = freshState();
      const { ctx } = makeCtx(state);
      STEP_HANDLERS.playerInput({
        type: 'playerInput',
        params: { prompt: 'Pick one', options: ['A', 'B'] },
      }, ctx);
      expect(state.media?.type).toBe('playerInput');
      expect(state.media?.prompt).toBe('Pick one');
      expect(state.media?.options).toEqual(['A', 'B']);
    });

    it('uses default prompt when missing', () => {
      const state = freshState();
      const { ctx } = makeCtx(state);
      STEP_HANDLERS.playerInput({
        type: 'playerInput',
        params: { options: ['Yes', 'No'] },
      }, ctx);
      expect(state.media?.prompt).toBe('What do you do?');
    });
  });
});

describe('runActionSteps', () => {
  let state: PlaytestState;
  beforeEach(() => { state = freshState(); });

  it('runs steps in order', () => {
    const { ctx } = makeCtx(state);
    runActionSteps([
      { type: 'playAudio', params: { url: 'theme.mp3' } },
      { type: 'showDialogue', params: { lines: [{ speaker: 'A', text: 'Hi' }] } },
    ], ctx);
    expect(state.audio?.url).toBe('theme.mp3');
    expect(state.dialogue).toHaveLength(1);
  });

  it('stops after changeScene', () => {
    const { ctx, sceneChanges } = makeCtx(state);
    runActionSteps([
      { type: 'changeScene', params: { targetSceneId: 'next' } },
      { type: 'playAudio', params: { url: 'should-not-play.mp3' } },
    ], ctx);
    expect(sceneChanges).toEqual([['next', 0, 0]]);
    expect(state.audio).toBeNull();
  });

  it('handles empty step list', () => {
    const { ctx } = makeCtx(state);
    runActionSteps([], ctx);
    expect(state.dialogue).toBeNull();
    expect(state.audio).toBeNull();
  });
});
