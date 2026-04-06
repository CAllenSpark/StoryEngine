import type { TileLayer } from '@storyengine/shared';

export class Tilemap {
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
}
