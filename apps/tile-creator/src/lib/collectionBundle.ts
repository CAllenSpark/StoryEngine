import type { SceneCollection, SpriteSheetDef } from '@storyengine/shared';
import type { StoredTileset, StoredSpriteSheet } from '../lib/assetDb.js';

/**
 * A self-contained collection bundle with all assets inlined as data URLs.
 * Version 3 adds sprite sheets to the bundle.
 */
export interface CollectionBundle {
  version: 3;
  kind: 'collection-bundle';
  exportedAt: number;
  collection: SceneCollection;
  /** Tilesets referenced by the collection's scenes, keyed by tileset id. */
  tilesets: Record<string, {
    id: string;
    name: string;
    filename: string;
    dataUrl: string;
    tileSize: number;
    columns: number;
  }>;
  /** Sprite sheets referenced by entities in the collection. */
  spriteSheets: Record<string, {
    def: SpriteSheetDef;
    dataUrl: string;
  }>;
}

/**
 * Build a self-contained bundle from the current collection + asset libraries.
 * Only includes tilesets and sprite sheets that are actually referenced.
 */
export function buildCollectionBundle(
  collection: SceneCollection,
  tilesetLibrary: StoredTileset[],
  spriteSheetLibrary: StoredSpriteSheet[],
): CollectionBundle {
  // Collect referenced tileset IDs — activeTilesetId plus scene-specific refs
  const tilesetIds = new Set<string>();
  if (collection.activeTilesetId) tilesetIds.add(collection.activeTilesetId);

  // Collect referenced sprite sheet IDs from entity properties across all scenes
  const spriteIds = new Set<string>();
  for (const entry of collection.scenes) {
    for (const ent of entry.scene.entities ?? []) {
      const props = ent.properties as { spriteSheetId?: string } | undefined;
      if (props?.spriteSheetId) spriteIds.add(props.spriteSheetId);
    }
  }

  const tilesets: CollectionBundle['tilesets'] = {};
  for (const t of tilesetLibrary) {
    if (!tilesetIds.has(t.id)) continue;
    tilesets[t.id] = {
      id: t.id,
      name: t.name,
      filename: t.filename,
      dataUrl: t.dataUrl,
      tileSize: t.tileSize,
      columns: t.columns,
    };
  }

  const spriteSheets: CollectionBundle['spriteSheets'] = {};
  for (const s of spriteSheetLibrary) {
    if (!spriteIds.has(s.id)) continue;
    spriteSheets[s.id] = { def: s.def, dataUrl: s.dataUrl };
  }

  return {
    version: 3,
    kind: 'collection-bundle',
    exportedAt: Date.now(),
    collection,
    tilesets,
    spriteSheets,
  };
}

/** Trigger a browser download of the bundle as a .json file. */
export function downloadBundle(bundle: CollectionBundle, filename?: string): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `${bundle.collection.name || 'adventure'}.storyengine.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so the download dialog has time to read the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Parse a bundle from a File (drag-drop or file input). */
export async function parseBundleFile(file: File): Promise<CollectionBundle> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (parsed.kind !== 'collection-bundle') {
    throw new Error('Not a StoryEngine collection bundle');
  }
  if (parsed.version !== 3) {
    throw new Error(`Unsupported bundle version: ${parsed.version}`);
  }
  return parsed as CollectionBundle;
}
