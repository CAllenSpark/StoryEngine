import { describe, it, expect } from 'vitest';
import { loadTilemap } from '../src/scene/TilemapLoader.js';
import type { SceneJSON } from '@storyengine/shared';

const validScene: SceneJSON = {
  version: 1,
  width: 3,
  height: 2,
  tileSize: 16,
  layers: [
    { name: 'ground', data: [0, 1, 2, 0, 1, 2] },
  ],
  tileset: { name: 'test', tileSize: 16, image: 'test.png', columns: 3 },
};

describe('loadTilemap', () => {
  it('loads a valid scene into a Tilemap', () => {
    const tilemap = loadTilemap(validScene);
    expect(tilemap.width).toBe(3);
    expect(tilemap.height).toBe(2);
    expect(tilemap.tileSize).toBe(16);
    expect(tilemap.layers).toHaveLength(1);
  });

  it('computes pixel dimensions', () => {
    const tilemap = loadTilemap(validScene);
    expect(tilemap.pixelWidth).toBe(48);
    expect(tilemap.pixelHeight).toBe(32);
  });

  it('returns correct tile at coordinates', () => {
    const tilemap = loadTilemap(validScene);
    expect(tilemap.getTile(0, 0, 0)).toBe(0);
    expect(tilemap.getTile(0, 2, 0)).toBe(2);
    expect(tilemap.getTile(0, 1, 1)).toBe(1);
  });

  it('returns -1 for out of bounds', () => {
    const tilemap = loadTilemap(validScene);
    expect(tilemap.getTile(0, -1, 0)).toBe(-1);
    expect(tilemap.getTile(0, 3, 0)).toBe(-1);
    expect(tilemap.getTile(1, 0, 0)).toBe(-1); // no layer 1
  });

  it('throws on empty layers', () => {
    const bad: SceneJSON = { ...validScene, layers: [] };
    expect(() => loadTilemap(bad)).toThrow('no layers');
  });

  it('throws on wrong tile count', () => {
    const bad: SceneJSON = {
      ...validScene,
      layers: [{ name: 'bad', data: [0, 1, 2] }],
    };
    expect(() => loadTilemap(bad)).toThrow('expected 6');
  });

  it('loads animations from tileset ref', () => {
    const scene: SceneJSON = {
      ...validScene,
      tileset: {
        ...validScene.tileset,
        animations: { '0': { frames: [0, 1, 2, 1], speed: 4 } },
      },
    };
    const tilemap = loadTilemap(scene);
    expect(tilemap.hasAnimations).toBe(true);
  });

  it('resolveAnimatedTile returns base tile when no animation', () => {
    const tilemap = loadTilemap(validScene);
    expect(tilemap.resolveAnimatedTile(0)).toBe(0);
    expect(tilemap.resolveAnimatedTile(2)).toBe(2);
  });

  it('resolveAnimatedTile cycles through frames after updateAnimations', () => {
    const scene: SceneJSON = {
      ...validScene,
      tileset: {
        ...validScene.tileset,
        animations: { '0': { frames: [0, 1, 2], speed: 4 } },
      },
    };
    const tilemap = loadTilemap(scene);
    // At t=0, should be frame 0
    tilemap.updateAnimations(0);
    expect(tilemap.resolveAnimatedTile(0)).toBe(0);

    // At t=250ms (1 frame at 4fps = 250ms), should be frame 1
    tilemap.updateAnimations(250);
    expect(tilemap.resolveAnimatedTile(0)).toBe(1);

    // At t=500ms, should be frame 2
    tilemap.updateAnimations(250);
    expect(tilemap.resolveAnimatedTile(0)).toBe(2);

    // At t=750ms, should wrap back to frame 0
    tilemap.updateAnimations(250);
    expect(tilemap.resolveAnimatedTile(0)).toBe(0);
  });

  it('non-animated tiles are unaffected by updateAnimations', () => {
    const scene: SceneJSON = {
      ...validScene,
      tileset: {
        ...validScene.tileset,
        animations: { '0': { frames: [0, 1], speed: 4 } },
      },
    };
    const tilemap = loadTilemap(scene);
    tilemap.updateAnimations(250);
    expect(tilemap.resolveAnimatedTile(2)).toBe(2);
  });

  it('ignores single-frame animations', () => {
    const scene: SceneJSON = {
      ...validScene,
      tileset: {
        ...validScene.tileset,
        animations: { '0': { frames: [0], speed: 4 } },
      },
    };
    const tilemap = loadTilemap(scene);
    expect(tilemap.hasAnimations).toBe(false);
    expect(tilemap.resolveAnimatedTile(0)).toBe(0);
  });
});
