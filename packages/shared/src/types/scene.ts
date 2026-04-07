export interface TilesetRef {
  name: string;
  tileSize: number;
  image: string;
  columns: number;
}

export interface TileLayer {
  name: string;
  data: number[];
  transforms?: number[];
}

export interface SceneJSON {
  version: number;
  width: number;
  height: number;
  tileSize: number;
  layers: TileLayer[];
  tileset: TilesetRef;
}

/**
 * A single scene within a collection.
 *
 * Planned extension fields (non-breaking, all optional):
 *   worldPosition?: { gridX: number; gridY: number }
 *   connections?: { direction: 'north'|'south'|'east'|'west'; targetSceneId: string }[]
 *
 * These allow scenes to be positioned on a world-map grid with directional
 * connections. A scene card can be reused at multiple positions (e.g., a road
 * tile repeated 4 times on the way to a castle). Implemented in a future
 * "world map layout" tool.
 */
export interface SceneEntry {
  id: string;
  name: string;
  scene: SceneJSON;
}

export interface SceneCollection {
  id: string;
  name: string;
  scenes: SceneEntry[];
  activeTilesetId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionExport {
  version: 2;
  collection: SceneCollection;
}
