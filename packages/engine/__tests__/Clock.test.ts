import { describe, it, expect } from 'vitest';
import { Clock } from '../src/core/Clock.js';

describe('Clock', () => {
  it('returns 0 delta on first tick', () => {
    const clock = new Clock();
    expect(clock.tick(1000)).toBe(0);
  });

  it('returns correct delta between ticks', () => {
    const clock = new Clock();
    clock.tick(1000);
    expect(clock.tick(1016.67)).toBeCloseTo(16.67, 1);
  });

  it('tracks elapsed time', () => {
    const clock = new Clock();
    clock.tick(0);
    clock.tick(100);
    clock.tick(250);
    expect(clock.elapsed).toBe(250);
  });

  it('clamps delta to 200ms to avoid spiral of death', () => {
    const clock = new Clock();
    clock.tick(0);
    // Simulate a 5-second pause (tab suspended)
    expect(clock.tick(5000)).toBe(200);
  });

  it('resets to initial state', () => {
    const clock = new Clock();
    clock.tick(0);
    clock.tick(100);
    clock.reset();
    expect(clock.elapsed).toBe(0);
    expect(clock.tick(200)).toBe(0); // first tick after reset
  });
});
