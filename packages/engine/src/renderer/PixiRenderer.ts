import { Application, Container, Graphics, Rectangle, Sprite, Texture, type ColorSource } from 'pixi.js';
import type { IRenderer } from './IRenderer.js';
import { RendererStats } from './RendererStats.js';
import type { Tilemap } from '../scene/Tilemap.js';
import type { Actor } from '../actor/Actor.js';
import { TILE_SIZE } from '@storyengine/shared';

export class PixiRenderer implements IRenderer {
  readonly stats = new RendererStats();

  private app!: Application;
  private stage!: Container;
  private tileTextures: Map<number, Texture> = new Map();
  private actorTextures: Texture[] = [];
  private frameStartTime = 0;

  async init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
    this.app = new Application();
    await this.app.init({
      canvas,
      width,
      height,
      backgroundColor: 0x1a1a2e,
      antialias: false,
      resolution: 1,
      autoDensity: false,
    });
    this.stage = this.app.stage;
    this.generatePlaceholderTextures();
  }

  begin(): void {
    this.frameStartTime = performance.now();
    this.stats.beginFrame(this.frameStartTime);

    // Clear previous frame's children
    while (this.stage.children.length > 0) {
      this.stage.removeChildAt(0);
    }
  }

  drawTilemap(tilemap: Tilemap, camera: { x: number; y: number }): void {
    for (const layer of tilemap.layers) {
      for (let y = 0; y < tilemap.height; y++) {
        for (let x = 0; x < tilemap.width; x++) {
          const idx = y * tilemap.width + x;
          const rawTileId = layer.data[idx];
          if (rawTileId === undefined || rawTileId < 0) continue;
          const tileId = tilemap.resolveAnimatedTile(rawTileId);

          const tex = this.tileTextures.get(tileId);
          if (!tex) continue;

          const sprite = new Sprite(tex);
          sprite.x = x * TILE_SIZE - camera.x;
          sprite.y = y * TILE_SIZE - camera.y;
          this.stage.addChild(sprite);
          this.stats.drawCalls++;
        }
      }
    }
  }

  drawActor(actor: Actor): void {
    const tex = this.actorTextures[actor.frame % this.actorTextures.length];
    if (!tex) return;

    const sprite = new Sprite(tex);
    sprite.x = Math.round(actor.x);
    sprite.y = Math.round(actor.y);
    this.stage.addChild(sprite);
    this.stats.spriteCount++;
    this.stats.drawCalls++;
  }

  end(): void {
    this.app.render();
    const frameTime = performance.now() - this.frameStartTime;
    this.stats.endFrame(frameTime);
  }

  destroy(): void {
    this.app.destroy(true);
  }

  async loadTilesetTexture(
    imageSource: string | HTMLImageElement,
    tileSize: number,
    columns: number,
  ): Promise<void> {
    const src = typeof imageSource === 'string' ? imageSource : imageSource.src;
    const baseTexture = await Texture.from(src).source;
    await baseTexture.load();
    const rows = Math.floor(baseTexture.height / tileSize);

    this.tileTextures.clear();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const id = r * columns + c;
        const frame = new Rectangle(c * tileSize, r * tileSize, tileSize, tileSize);
        const tex = new Texture({ source: baseTexture, frame });
        this.tileTextures.set(id, tex);
      }
    }
  }

  private generatePlaceholderTextures(): void {
    const colors: ColorSource[] = [0x4a7c59, 0x8b6914, 0x2a5c8b, 0xc2a645];

    for (let i = 0; i < colors.length; i++) {
      const g = new Graphics();
      g.rect(0, 0, TILE_SIZE, TILE_SIZE);
      g.fill(colors[i]!);
      this.tileTextures.set(i, this.app.renderer.generateTexture(g));
      g.destroy();
    }

    const actorColors: ColorSource[] = [0xe74c3c, 0xe67e22, 0xf1c40f, 0x3498db];
    for (const color of actorColors) {
      const g = new Graphics();
      g.rect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
      g.fill(color);
      this.actorTextures.push(this.app.renderer.generateTexture(g));
      g.destroy();
    }
  }
}
