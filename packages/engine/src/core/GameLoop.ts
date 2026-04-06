import { Clock } from './Clock.js';

export interface GameLoopCallbacks {
  update(dt: number): void;
  render(interpolation: number): void;
}

/**
 * Fixed-timestep game loop with variable rendering.
 * Logic ticks at a fixed rate (default 60 Hz); rendering runs as fast as possible.
 */
export class GameLoop {
  private readonly clock = new Clock();
  private readonly fixedDt: number;
  private accumulator = 0;
  private rafId = 0;
  private _running = false;

  constructor(
    private readonly callbacks: GameLoopCallbacks,
    fixedHz = 60,
  ) {
    this.fixedDt = 1000 / fixedHz;
  }

  get running(): boolean {
    return this._running;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this.clock.reset();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame((t) => this.frame(t));
  }

  stop(): void {
    this._running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private frame(timestamp: number): void {
    if (!this._running) return;

    const delta = this.clock.tick(timestamp);
    this.accumulator += delta;

    // Fixed-timestep logic updates
    while (this.accumulator >= this.fixedDt) {
      this.callbacks.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    // Render with interpolation factor
    const interpolation = this.accumulator / this.fixedDt;
    this.callbacks.render(interpolation);

    this.rafId = requestAnimationFrame((t) => this.frame(t));
  }
}
