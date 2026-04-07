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

  it('loads phased animations from tileset ref', () => {
    const scene: SceneJSON = {
      ...validScene,
      tileset: {
        ...validScene.tileset,
        animations: { '0': { phases: [{ frames: [0, 1, 2, 1], speed: 4 }] } },
      },
    };
    const tilemap = loadTilemap(scene);
    expect(tilemap.hasAnimations).toBe(true);
  });

  it('migrates old format { frames, speed } to phased', () => {
    const scene: SceneJSON = {
      ...validScene,
      tileset: {
        ...validScene.tileset,
        animations: { '0': { frames: [0, 1, 2], speed: 4 } as any },
      },
    };
    const tilemap = loadTilemap(scene);
    expect(tilemap.hasAnimations).toBe(true);
    tilemap.updateAnimations(250);
    expect(tilemap.resolveAnimatedTile(0)).toBe(1);
  });

  it('resolveAnimatedTile returns base tile when no animation', () => {
    const tilemap = loadTilemap(validScene);
    expect(tilemap.resolveAnimatedTile(0)).toBe(0);
    expect(tilemap.resolveAnimatedTile(2)).toBe(2);
  });

  it('resolveAnimatedTile cycles through frames (infinite loop)', () => {
    const scene: SceneJSON = {
      ...validScene,
      tileset: {
        ...validScene.tileset,
        animations: { '0': { phases: [{ frames: [0, 1, 2], speed: 4 }] } },
      },
    };
    const tilemap = loadTilemap(scene);
    tilemap.updateAnimations(0);
    expect(tilemap.resolveAnimatedTile(0)).toBe(0);

    tilemap.updateAnimations(250);
    expect(tilemap.resolveAnimatedTile(0)).toBe(1);

    tilemap.updateAnimations(250);
    expect(tilemap.resolveAnimatedTile(0)).toBe(2);

    tilemap.updateAnimations(250);
    expect(tilemap.resolveAnimatedTile(0)).toBe(0);
  });

  it('finite loops stop after N cycles', () => {
    const scene: SceneJSON = {
      ...validScene,
      tileset: {
        ...validScene.tileset,
        animations: { '0': { phases: [{ frames: [0, 1], speed: 4, loops: 2 }] } },
      },
    };
    const tilemap = loadTilemap(scene);
    // 2 frames at 4fps = 500ms per cycle, 2 loops = 1000ms total
    // Advance through both loops
    tilemap.updateAnimations(250); // frame 1
    expect(tilemap.resolveAnimatedTile(0)).toBe(1);
    tilemap.updateAnimations(250); // frame 0 (loop 2)
    expect(tilemap.resolveAnimatedTile(0)).toBe(0);
    tilemap.updateAnimations(250); // frame 1 (loop 2)
    expect(tilemap.resolveAnimatedTile(0)).toBe(1);
    tilemap.updateAnimations(250); // finished — holds last frame
    expect(tilemap.resolveAnimatedTile(0)).toBe(1);
    // Further updates don't change it
    tilemap.updateAnimations(1000);
    expect(tilemap.resolveAnimatedTile(0)).toBe(1);
  });

  it('chained phases transition correctly', () => {
    const scene: SceneJSON = {
      ...validScene,
      tileset: {
        ...validScene.tileset,
        animations: {
          '0': {
            phases: [
              { frames: [0, 1], speed: 4, loops: 1 },  // 500ms total
              { frames: [2, 3], speed: 4 },              // infinite
            ],
          },
        },
      },
    };
    const tilemap = loadTilemap(scene);
    // Phase 1: 2 frames at 4fps, 1 loop = 500ms
    tilemap.updateAnimations(250);
    expect(tilemap.resolveAnimatedTile(0)).toBe(1); // phase 1, frame 1

    tilemap.updateAnimations(250); // 500ms — phase 1 complete, enters phase 2
    expect(tilemap.resolveAnimatedTile(0)).toBe(2); // phase 2, frame 0

    tilemap.updateAnimations(250); // 750ms — phase 2, frame 1
    expect(tilemap.resolveAnimatedTile(0)).toBe(3);

    tilemap.updateAnimations(250); // 1000ms — phase 2 loops, frame 0
    expect(tilemap.resolveAnimatedTile(0)).toBe(2);
  });

  it('non-animated tiles are unaffected by updateAnimations', () => {
    const scene: SceneJSON = {
      ...validScene,
      tileset: {
        ...validScene.tileset,
        animations: { '0': { phases: [{ frames: [0, 1], speed: 4 }] } },
      },
    };
    const tilemap = loadTilemap(scene);
    tilemap.updateAnimations(250);
    expect(tilemap.resolveAnimatedTile(2)).toBe(2);
  });

  it('ignores single-phase single-frame animations', () => {
    const scene: SceneJSON = {
      ...validScene,
      tileset: {
        ...validScene.tileset,
        animations: { '0': { phases: [{ frames: [0], speed: 4 }] } },
      },
    };
    const tilemap = loadTilemap(scene);
    expect(tilemap.hasAnimations).toBe(false);
    expect(tilemap.resolveAnimatedTile(0)).toBe(0);
  });
});
