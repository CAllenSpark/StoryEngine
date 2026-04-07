import type { TileLayer, TileAnimation } from '@storyengine/shared';

export class Tilemap {
  private animations: Map<number, TileAnimation> = new Map();
  private animAccum = 0;
  private animFrameIndices: Map<number, number> = new Map();

  constructor(
    readonly width: number,
    readonly height: number,
    readonly tileSize: number,
    readonly layers: TileLayer[],
  ) {}

  /** Pixel width of the tilemap. */
  get pixelWidth(): number {
    return this.width * this.tileSize;
  }

  /** Pixel height of the tilemap. */
  get pixelHeight(): number {
    return this.height * this.tileSize;
  }

  /** Get tile ID at grid coordinates for a specific layer. Returns -1 if out of bounds. */
  getTile(layerIndex: number, x: number, y: number): number {
    const layer = this.layers[layerIndex];
    if (!layer || x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
    return layer.data[y * this.width + x] ?? -1;
  }

  setAnimations(anims: Record<string, TileAnimation> | undefined): void {
    this.animations.clear();
    this.animFrameIndices.clear();
    if (!anims) return;
    for (const [key, anim] of Object.entries(anims)) {
      if (anim.frames.length < 2) continue;
      const id = Number(key);
      this.animations.set(id, anim);
      this.animFrameIndices.set(id, 0);
    }
  }

  updateAnimations(dt: number): void {
    if (this.animations.size === 0) return;
    this.animAccum += dt;
    for (const [baseTileId, anim] of this.animations) {
      const frameDuration = 1000 / anim.speed;
      const totalDuration = frameDuration * anim.frames.length;
      const t = this.animAccum % totalDuration;
      this.animFrameIndices.set(baseTileId, Math.floor(t / frameDuration));
    }
  }

  resolveAnimatedTile(tileId: number): number {
    const anim = this.animations.get(tileId);
    if (!anim) return tileId;
    const frameIdx = this.animFrameIndices.get(tileId) ?? 0;
    return anim.frames[frameIdx] ?? tileId;
  }

  get hasAnimations(): boolean {
    return this.animations.size > 0;
  }
}
