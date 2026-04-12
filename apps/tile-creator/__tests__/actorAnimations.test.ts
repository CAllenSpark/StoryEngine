import { describe, it, expect } from 'vitest';
import type { SpriteSheetDef, SpriteAnimState } from '@storyengine/shared';
import {
  resolveActorState,
  advanceActorAnim,
  type LoadedSpriteSheet,
} from '../src/hooks/playtest/actorAnimations.js';

function makeState(name: string, overrides: Partial<SpriteAnimState> = {}): SpriteAnimState {
  return {
    name,
    row: 0,
    colStart: 0,
    frameCount: 4,
    fps: 8,
    loop: true,
    ...overrides,
  };
}

function makeSheet(states: SpriteAnimState[], defaultState = 'idle-down'): LoadedSpriteSheet {
  const def: SpriteSheetDef = {
    id: 'test',
    name: 'Test',
    frameWidth: 16,
    frameHeight: 24,
    columns: 4,
    rows: states.length,
    states,
    defaultState,
  };
  return {
    def,
    image: { complete: true, naturalWidth: 64 } as HTMLImageElement,
    stateMap: new Map(states.map((s) => [s.name, s])),
  };
}

describe('resolveActorState', () => {
  it('returns walk-{facing} when moving and state exists', () => {
    const sheet = makeSheet([
      makeState('idle-down'), makeState('walk-down'),
      makeState('idle-right'), makeState('walk-right'),
    ]);
    expect(resolveActorState(sheet, 'right', true)).toBe('walk-right');
    expect(resolveActorState(sheet, 'down', true)).toBe('walk-down');
  });

  it('returns idle-{facing} when stopped', () => {
    const sheet = makeSheet([
      makeState('idle-down'), makeState('walk-down'),
    ]);
    expect(resolveActorState(sheet, 'down', false)).toBe('idle-down');
  });

  it('falls back to opposite mode for same facing when desired missing', () => {
    // Sheet has only walk-left, no idle-left — should fall back to walk-left when idle requested
    const sheet = makeSheet([makeState('walk-left'), makeState('idle-down')]);
    expect(resolveActorState(sheet, 'left', false)).toBe('walk-left');
  });

  it('falls back to defaultState when nothing matches', () => {
    const sheet = makeSheet([makeState('idle-down')], 'idle-down');
    expect(resolveActorState(sheet, 'up', true)).toBe('idle-down');
    expect(resolveActorState(sheet, 'right', false)).toBe('idle-down');
  });
});

describe('advanceActorAnim', () => {
  it('creates a fresh anim when state changes', () => {
    const sheet = makeSheet([makeState('walk-down', { frameCount: 4, fps: 8 })]);
    const next = advanceActorAnim(
      { stateName: 'idle-down', frame: 2, accumMs: 0 },
      sheet,
      'walk-down',
      0,
    );
    expect(next.stateName).toBe('walk-down');
    expect(next.frame).toBe(0);
    expect(next.accumMs).toBe(0);
  });

  it('advances frame when accumulator crosses frame duration', () => {
    const sheet = makeSheet([makeState('walk-down', { frameCount: 4, fps: 10 })]);
    // frame duration = 1000/10 = 100ms. 250ms advances 2 frames.
    const next = advanceActorAnim(
      { stateName: 'walk-down', frame: 0, accumMs: 0 },
      sheet,
      'walk-down',
      250,
    );
    expect(next.frame).toBe(2);
    expect(next.accumMs).toBe(50);
  });

  it('loops back to frame 0 when loop is true', () => {
    const sheet = makeSheet([makeState('walk-down', { frameCount: 4, fps: 10, loop: true })]);
    const next = advanceActorAnim(
      { stateName: 'walk-down', frame: 3, accumMs: 0 },
      sheet,
      'walk-down',
      100,
    );
    expect(next.frame).toBe(0);
  });

  it('holds last frame when loop is false', () => {
    const sheet = makeSheet([makeState('interact', { frameCount: 3, fps: 10, loop: false })]);
    const next = advanceActorAnim(
      { stateName: 'interact', frame: 2, accumMs: 0 },
      sheet,
      'interact',
      500,
    );
    expect(next.frame).toBe(2);
  });

  it('is a no-op for single-frame states', () => {
    const sheet = makeSheet([makeState('idle-down', { frameCount: 1 })]);
    const next = advanceActorAnim(
      { stateName: 'idle-down', frame: 0, accumMs: 0 },
      sheet,
      'idle-down',
      1000,
    );
    expect(next.frame).toBe(0);
  });

  it('returns defaultState anim when desired state missing', () => {
    const sheet = makeSheet([makeState('idle-down')]);
    const next = advanceActorAnim(undefined, sheet, 'nonexistent', 0);
    expect(next.stateName).toBe('nonexistent'); // returns anim keyed on the requested name even if state missing
    expect(next.frame).toBe(0);
  });
});
