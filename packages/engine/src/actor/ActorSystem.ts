import type { IRenderer } from '../renderer/IRenderer.js';
import { ActorPool } from './ActorPool.js';
import type { Tilemap } from '../scene/Tilemap.js';

/**
 * Updates and draws all active actors.
 * For the Sprint 2 spike, actors bounce randomly within tilemap bounds.
 */
export class ActorSystem {
  readonly pool: ActorPool;

  constructor(capacity: number) {
    this.pool = new ActorPool(capacity);
  }

  /** Spawn actors at random positions with random velocities within tilemap bounds. */
  spawnRandom(count: number, tilemap: Tilemap): void {
    const maxX = tilemap.pixelWidth - tilemap.tileSize;
    const maxY = tilemap.pixelHeight - tilemap.tileSize;

    for (let i = 0; i < count; i++) {
      const actor = this.pool.acquire();
      if (!actor) break;

      actor.x = Math.random() * maxX;
      actor.y = Math.random() * maxY;
      actor.vx = (Math.random() - 0.5) * 60; // pixels per second
      actor.vy = (Math.random() - 0.5) * 60;
      actor.frame = Math.floor(Math.random() * actor.totalFrames);
    }
  }

  /** Update all active actors. dt is in milliseconds. */
  update(dt: number, tilemap: Tilemap): void {
    const dtSec = dt / 1000;
    const maxX = tilemap.pixelWidth - tilemap.tileSize;
    const maxY = tilemap.pixelHeight - tilemap.tileSize;

    this.pool.forEach((actor) => {
      // Move
      actor.x += actor.vx * dtSec;
      actor.y += actor.vy * dtSec;

      // Bounce off edges
      if (actor.x <= 0 || actor.x >= maxX) {
        actor.vx = -actor.vx;
        actor.x = Math.max(0, Math.min(actor.x, maxX));
      }
      if (actor.y <= 0 || actor.y >= maxY) {
        actor.vy = -actor.vy;
        actor.y = Math.max(0, Math.min(actor.y, maxY));
      }

      // Animate
      actor.updateAnimation(dt);
    });
  }

  /** Draw all active actors via the renderer. */
  draw(renderer: IRenderer): void {
    this.pool.forEach((actor) => {
      renderer.drawActor(actor);
    });
  }
}
