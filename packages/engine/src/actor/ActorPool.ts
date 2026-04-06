import { Actor } from './Actor.js';

/**
 * Pre-allocated object pool for actors.
 * Zero allocations during gameplay — per coding-standards.md:
 * "Object pool hot objects; never allocate inside the render loop."
 */
export class ActorPool {
  private readonly pool: Actor[];
  private activeCount = 0;

  constructor(capacity: number) {
    this.pool = Array.from({ length: capacity }, () => new Actor());
  }

  get active(): number {
    return this.activeCount;
  }

  get capacity(): number {
    return this.pool.length;
  }

  /** Acquire an actor from the pool. Returns null if pool is exhausted. */
  acquire(): Actor | null {
    if (this.activeCount >= this.pool.length) return null;

    const actor = this.pool[this.activeCount]!;
    actor.reset();
    actor.active = true;
    this.activeCount++;
    return actor;
  }

  /** Release an actor back to the pool by swapping with the last active. */
  release(actor: Actor): void {
    const idx = this.pool.indexOf(actor);
    if (idx < 0 || idx >= this.activeCount) return;

    actor.active = false;
    this.activeCount--;

    // Swap with last active
    const last = this.pool[this.activeCount]!;
    this.pool[idx] = last;
    this.pool[this.activeCount] = actor;
  }

  /** Iterate over all active actors. */
  forEach(fn: (actor: Actor) => void): void {
    for (let i = 0; i < this.activeCount; i++) {
      fn(this.pool[i]!);
    }
  }

  /** Release all actors back to the pool. */
  releaseAll(): void {
    for (let i = 0; i < this.activeCount; i++) {
      this.pool[i]!.active = false;
    }
    this.activeCount = 0;
  }
}
