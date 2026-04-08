import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InputManager } from '../src/input/InputManager.js';

class MockTarget extends EventTarget {}

function keyEvent(type: string, code: string): Event {
  const e = new Event(type);
  (e as Event & { code: string }).code = code;
  return e;
}

describe('InputManager', () => {
  let target: MockTarget;
  let input: InputManager;

  beforeEach(() => {
    target = new MockTarget();
    input = new InputManager(target);
  });

  afterEach(() => {
    input.destroy();
  });

  it('tracks key press state', () => {
    expect(input.isDown('KeyW')).toBe(false);
    target.dispatchEvent(keyEvent('keydown', 'KeyW'));
    expect(input.isDown('KeyW')).toBe(true);
    target.dispatchEvent(keyEvent('keyup', 'KeyW'));
    expect(input.isDown('KeyW')).toBe(false);
  });

  it('tracks just-pressed for one frame', () => {
    target.dispatchEvent(keyEvent('keydown', 'Space'));
    expect(input.isJustPressed('Space')).toBe(true);
    input.endFrame();
    expect(input.isJustPressed('Space')).toBe(false);
    expect(input.isDown('Space')).toBe(true);
  });

  it('getMovement returns direction', () => {
    target.dispatchEvent(keyEvent('keydown', 'KeyW'));
    const move = input.getMovement();
    expect(move.x).toBe(0);
    expect(move.y).toBe(-1);
  });

  it('getMovement normalizes diagonal', () => {
    target.dispatchEvent(keyEvent('keydown', 'KeyW'));
    target.dispatchEvent(keyEvent('keydown', 'KeyD'));
    const move = input.getMovement();
    expect(move.x).toBeCloseTo(1 / Math.SQRT2);
    expect(move.y).toBeCloseTo(-1 / Math.SQRT2);
  });

  it('destroy removes listeners', () => {
    input.destroy();
    target.dispatchEvent(keyEvent('keydown', 'KeyA'));
    expect(input.isDown('KeyA')).toBe(false);
  });
});
