import type { SceneJSON } from '@storyengine/shared';
import { Tilemap } from './Tilemap.js';

export function loadTilemap(data: SceneJSON): Tilemap {
  if (!data.layers || data.layers.length === 0) {
    throw new Error('Scene has no layers');
  }

  const expectedTiles = data.width * data.height;
  for (const layer of data.layers) {
    if (layer.data.length !== expectedTiles) {
      throw new Error(
        `Layer "${layer.name}" has ${layer.data.length} tiles, expected ${expectedTiles}`,
      );
    }
  }

  const tilemap = new Tilemap(data.width, data.height, data.tileSize, data.layers);
  tilemap.setAnimations(data.tileset.animations);
  tilemap.setGroupAnimations(data.groupAnimations);
  tilemap.setCollisionLayer(data.collisionLayer);
  return tilemap;
}
