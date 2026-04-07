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
