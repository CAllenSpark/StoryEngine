import type { RendererStats } from '../renderer/RendererStats.js';

/**
 * Debug performance overlay rendered directly to a 2D canvas context.
 * Zero cost when disabled — no allocations, no sampling, no draw calls.
 *
 * Activated by ?debug=perf URL param or localStorage SE_DEBUG=1.
 */
export class PerfOverlay {
  private ctx: CanvasRenderingContext2D | null = null;
  private _enabled = false;

  get enabled(): boolean {
    return this._enabled;
  }

  /** Initialize with a canvas context for text rendering. */
  init(canvas: HTMLCanvasElement, enabled: boolean): void {
    this._enabled = enabled;
    if (!enabled) return;

    // Create an overlay canvas on top of the game canvas
    const overlay = document.createElement('canvas');
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    overlay.style.cssText = canvas.style.cssText;
    overlay.style.position = 'absolute';
    overlay.style.top = canvas.offsetTop + 'px';
    overlay.style.left = canvas.offsetLeft + 'px';
    overlay.style.pointerEvents = 'none';
    overlay.style.imageRendering = 'pixelated';
    canvas.parentElement?.appendChild(overlay);

    this.ctx = overlay.getContext('2d');
  }

  /** Draw the stats overlay. No-op if disabled. */
  draw(stats: RendererStats): void {
    if (!this._enabled || !this.ctx) return;

    const ctx = this.ctx;
    const w = ctx.canvas.width;

    // Clear overlay
    ctx.clearRect(0, 0, w, 60);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, 52);

    // Text
    ctx.fillStyle = '#0f0';
    ctx.font = '10px monospace';

    const lines = [
      `FPS: ${stats.fps}  Frame: ${stats.frameTimeMs.toFixed(1)}ms  p95: ${stats.frameTimeP95Ms.toFixed(1)}ms`,
      `Draw: ${stats.drawCalls}  Sprites: ${stats.spriteCount}  Mem: ${stats.memoryMb > 0 ? stats.memoryMb + 'MB' : 'N/A'}`,
    ];

    lines.forEach((line, i) => {
      ctx.fillText(line, 4, 14 + i * 16);
    });
  }
}
