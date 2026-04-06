import type { Tilemap } from '../scene/Tilemap.js';
import type { Actor } from '../actor/Actor.js';
import type { RendererStats } from './RendererStats.js';

export interface IRenderer {
  init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void>;
  begin(): void;
  drawTilemap(tilemap: Tilemap, camera: { x: number; y: number }): void;
  drawActor(actor: Actor): void;
  end(): void;
  destroy(): void;
  loadTilesetTexture?(imageSource: string | HTMLImageElement, tileSize: number, columns: number): Promise<void>;
  readonly stats: RendererStats;
}
