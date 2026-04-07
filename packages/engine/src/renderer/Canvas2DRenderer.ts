import type { IRenderer } from './IRenderer.js';
import { RendererStats } from './RendererStats.js';
import type { Tilemap } from '../scene/Tilemap.js';
import type { Actor } from '../actor/Actor.js';
import { TILE_SIZE } from '@storyengine/shared';

const TILE_COLORS = ['#4a7c59', '#8b6914', '#2a5c8b', '#c2a645'];
const ACTOR_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#3498db'];

export class Canvas2DRenderer implements IRenderer {
  readonly stats = new RendererStats();

  private ctx!: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private frameStartTime = 0;

  async init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
    this.width = width;
    this.height = height;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas2D context not available');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  begin(): void {
    this.frameStartTime = performance.now();
    this.stats.beginFrame(this.frameStartTime);
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawTilemap(tilemap: Tilemap, camera: { x: number; y: number }): void {
    for (const layer of tilemap.layers) {
      for (let y = 0; y < tilemap.height; y++) {
        for (let x = 0; x < tilemap.width; x++) {
          const idx = y * tilemap.width + x;
          const rawTileId = layer.data[idx];
          if (rawTileId === undefined || rawTileId < 0) continue;
          const tileId = tilemap.resolveAnimatedTile(rawTileId);

          this.ctx.fillStyle = TILE_COLORS[tileId % TILE_COLORS.length]!;
          this.ctx.fillRect(
            x * TILE_SIZE - camera.x,
            y * TILE_SIZE - camera.y,
            TILE_SIZE,
            TILE_SIZE,
          );
          this.stats.drawCalls++;
        }
      }
    }
  }

  drawActor(actor: Actor): void {
    this.ctx.fillStyle = ACTOR_COLORS[actor.frame % ACTOR_COLORS.length]!;
    this.ctx.fillRect(Math.round(actor.x) + 2, Math.round(actor.y) + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    this.stats.spriteCount++;
    this.stats.drawCalls++;
  }

  end(): void {
    const frameTime = performance.now() - this.frameStartTime;
    this.stats.endFrame(frameTime);
  }

  async loadTilesetTexture(
    _imageSource: string | HTMLImageElement,
    _tileSize: number,
    _columns: number,
  ): Promise<void> {
    // Canvas2D tileset loading — stub for future implementation
  }

  destroy(): void {
    // Canvas2D doesn't need explicit cleanup
  }
}
