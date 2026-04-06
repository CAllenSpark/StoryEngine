/**
 * High-resolution clock for the game loop.
 * Tracks elapsed time and computes delta between ticks.
 */
export class Clock {
  private lastTime = 0;
  private _elapsed = 0;
  private started = false;

  /** Time elapsed since clock started, in ms. */
  get elapsed(): number {
    return this._elapsed;
  }

  /**
   * Advance the clock. Returns delta in ms since last tick.
   * First call returns 0.
   */
  tick(now: number): number {
    if (!this.started) {
      this.started = true;
      this.lastTime = now;
      return 0;
    }

    const delta = now - this.lastTime;
    this.lastTime = now;
    this._elapsed += delta;

    // Clamp to avoid spiral of death after tab suspension
    return Math.min(delta, 200);
  }

  reset(): void {
    this.lastTime = 0;
    this._elapsed = 0;
    this.started = false;
  }
}
