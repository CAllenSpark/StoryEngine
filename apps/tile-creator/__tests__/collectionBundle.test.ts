import { describe, it, expect } from 'vitest';
import type { SceneCollection, SceneJSON, SpriteSheetDef } from '@storyengine/shared';
import { buildCollectionBundle, type CollectionBundle } from '../src/lib/collectionBundle.js';
import type { StoredTileset, StoredSpriteSheet } from '../src/lib/assetDb.js';

function makeScene(id: string, entities: SceneJSON['entities'] = []): SceneJSON {
  return {
    version: 1,
    width: 10,
    height: 10,
    tileSize: 16,
    layers: [{ name: 'base', data: new Array(100).fill(-1) }],
    tileset: { name: 'test', tileSize: 16, image: '', columns: 10 },
    entities,
  };
}

function makeTileset(id: string, name = id): StoredTileset {
  return {
    id, name, filename: `${name}.png`, dataUrl: `data:image/png;base64,${id}`,
    tileSize: 16, columns: 10, storedAt: Date.now(),
  };
}

function makeSpriteSheet(id: string): StoredSpriteSheet {
  const def: SpriteSheetDef = {
    id, name: `sheet-${id}`, frameWidth: 16, frameHeight: 24,
    columns: 4, rows: 2, defaultState: 'idle-down',
    states: [{ name: 'idle-down', row: 0, colStart: 0, frameCount: 1, fps: 2 }],
  };
  return { id, def, dataUrl: `data:image/png;base64,${id}`, storedAt: Date.now() };
}

function makeCollection(scenes: SceneJSON[], activeTilesetId?: string): SceneCollection {
  return {
    id: 'col-1',
    name: 'Test Collection',
    activeTilesetId,
    scenes: scenes.map((s, i) => ({ id: `scene-${i}`, name: `Scene ${i}`, scene: s })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('buildCollectionBundle', () => {
  it('includes only the activeTilesetId', () => {
    const collection = makeCollection([makeScene('s1')], 'ts-a');
    const bundle = buildCollectionBundle(
      collection,
      [makeTileset('ts-a'), makeTileset('ts-b')],
      [],
    );
    expect(Object.keys(bundle.tilesets)).toEqual(['ts-a']);
  });

  it('includes only sprite sheets referenced by entities', () => {
    const collection = makeCollection([
      makeScene('s1', [
        { id: 'e1', type: 'spawn', x: 0, y: 0, properties: { spriteSheetId: 'sheet-hero' } },
        { id: 'e2', type: 'npc', x: 1, y: 1, properties: { name: 'Bob', dialogue: [], spriteSheetId: 'sheet-bob' } },
      ]),
    ]);
    const bundle = buildCollectionBundle(
      collection,
      [],
      [makeSpriteSheet('sheet-hero'), makeSpriteSheet('sheet-bob'), makeSpriteSheet('sheet-unused')],
    );
    expect(Object.keys(bundle.spriteSheets).sort()).toEqual(['sheet-bob', 'sheet-hero']);
  });

  it('produces a well-formed bundle', () => {
    const collection = makeCollection([makeScene('s1')]);
    const bundle = buildCollectionBundle(collection, [], []);
    expect(bundle.kind).toBe('collection-bundle');
    expect(bundle.version).toBe(3);
    expect(bundle.collection).toBe(collection);
    expect(typeof bundle.exportedAt).toBe('number');
  });

  it('round-trips through JSON without loss', () => {
    const collection = makeCollection([
      makeScene('s1', [
        { id: 'e1', type: 'spawn', x: 5, y: 3, properties: { spriteSheetId: 'sheet-hero' } },
      ]),
    ], 'ts-a');
    const bundle = buildCollectionBundle(
      collection,
      [makeTileset('ts-a')],
      [makeSpriteSheet('sheet-hero')],
    );
    const parsed = JSON.parse(JSON.stringify(bundle)) as CollectionBundle;
    expect(parsed.collection.scenes.length).toBe(1);
    expect(parsed.tilesets['ts-a'].tileSize).toBe(16);
    expect(parsed.spriteSheets['sheet-hero'].def.defaultState).toBe('idle-down');
  });

  it('handles empty collection with no assets', () => {
    const collection = makeCollection([makeScene('s1')]);
    const bundle = buildCollectionBundle(collection, [], []);
    expect(Object.keys(bundle.tilesets)).toHaveLength(0);
    expect(Object.keys(bundle.spriteSheets)).toHaveLength(0);
  });
});
