export class Actor {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  frame = 0;
  animSpeed = 8; // frames per second
  totalFrames = 4;
  active = false;

  private animAccum = 0;

  /** Update animation frame based on elapsed time. */
  updateAnimation(dt: number): void {
    this.animAccum += dt;
    const frameDuration = 1000 / this.animSpeed;

    while (this.animAccum >= frameDuration) {
      this.frame = (this.frame + 1) % this.totalFrames;
      this.animAccum -= frameDuration;
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
  }
}
