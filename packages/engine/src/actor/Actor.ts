export type ActorType = 'player' | 'npc' | 'prop';
export type Facing = 'down' | 'up' | 'left' | 'right';

export class Actor {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  frame = 0;
  animSpeed = 8;
  totalFrames = 4;
  active = false;

  type: ActorType = 'prop';
  facing: Facing = 'down';
  speed = 64; // pixels per second
  spriteId = '';
  entityId = '';

  private animAccum = 0;

  updateAnimation(dt: number): void {
    if (this.vx === 0 && this.vy === 0) return; // don't animate when idle
    this.animAccum += dt;
    const frameDuration = 1000 / this.animSpeed;
    while (this.animAccum >= frameDuration) {
      this.frame = (this.frame + 1) % this.totalFrames;
      this.animAccum -= frameDuration;
    }
  }

  /** Update facing direction from current velocity. */
  updateFacing(): void {
    if (Math.abs(this.vx) > Math.abs(this.vy)) {
      this.facing = this.vx > 0 ? 'right' : 'left';
    } else if (this.vy !== 0) {
      this.facing = this.vy > 0 ? 'down' : 'up';
    }
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.frame = 0;
    this.animAccum = 0;
    this.active = false;
    this.type = 'prop';
    this.facing = 'down';
    this.speed = 64;
    this.spriteId = '';
    this.entityId = '';
  }
}
