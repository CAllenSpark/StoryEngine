import type { RendererStats as IRendererStats } from '@storyengine/shared';

/** Mutable stats object updated each frame by the renderer. */
export class RendererStats implements IRendererStats {
  fps = 0;
  frameTimeMs = 0;
  frameTimeP95Ms = 0;
  drawCalls = 0;
  spriteCount = 0;
  memoryMb = 0;

  private frameTimes: number[] = [];
  private frameCount = 0;
  private lastFpsTime = 0;
  private readonly sampleSize = 300;

  /** Call at the start of each frame. */
  beginFrame(now: number): void {
    if (this.lastFpsTime === 0) this.lastFpsTime = now;

    const elapsed = now - this.lastFpsTime;
    this.frameCount++;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    this.drawCalls = 0;
    this.spriteCount = 0;
  }

  /** Call at the end of each frame with the frame's duration. */
  endFrame(frameTimeMs: number): void {
    this.frameTimeMs = frameTimeMs;
    this.frameTimes.push(frameTimeMs);

    if (this.frameTimes.length > this.sampleSize) {
      this.frameTimes.shift();
    }

    // p95: sort a copy, pick 95th percentile
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    this.frameTimeP95Ms = sorted[idx] ?? frameTimeMs;

    // Memory estimate (Chrome only)
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    if (mem) {
      this.memoryMb = Math.round(mem.usedJSHeapSize / (1024 * 1024));
    }
  }

  reset(): void {
    this.fps = 0;
    this.frameTimeMs = 0;
    this.frameTimeP95Ms = 0;
    this.drawCalls = 0;
    this.spriteCount = 0;
    this.memoryMb = 0;
    this.frameTimes = [];
    this.frameCount = 0;
    this.lastFpsTime = 0;
  }
}
