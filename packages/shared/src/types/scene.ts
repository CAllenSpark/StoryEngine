export interface TilesetRef {
  name: string;
  tileSize: number;
  image: string;
  columns: number;
}

export interface TileLayer {
  name: string;
  data: number[];
}

export interface SceneJSON {
  version: number;
  width: number;
  height: number;
  tileSize: number;
  layers: TileLayer[];
  tileset: TilesetRef;
}
