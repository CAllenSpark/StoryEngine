import type { SceneJSON, TilesetRef } from '@storyengine/shared';

export type Tool = 'paint' | 'erase';

export interface ImportWarning {
  level: 'info' | 'warn';
  message: string;
}

export interface TilesetState {
  ref: TilesetRef;
  imageDataUrl: string;
  tileImages: ImageBitmap[];
}

export interface EditorState {
  scene: SceneJSON;
  activeTool: Tool;
  selectedTileId: number;
  activeLayerIndex: number;
  layerVisibility: boolean[];
  zoom: number;
  tileset: TilesetState | null;
}

export interface EditorActions {
  paintTile: (x: number, y: number) => void;
  eraseTile: (x: number, y: number) => void;
  addLayer: (name: string) => void;
  removeLayer: (index: number) => void;
  moveLayer: (from: number, to: number) => void;
  renameLayer: (index: number, name: string) => void;
  setActiveTool: (tool: Tool) => void;
  setSelectedTile: (id: number) => void;
  setActiveLayer: (index: number) => void;
  toggleLayerVisibility: (index: number) => void;
  setZoom: (zoom: number) => void;
  setTileset: (tileset: TilesetState) => void;
  loadScene: (scene: SceneJSON) => void;
  restoreTileset: () => Promise<void>;
}

export type EditorStore = EditorState & EditorActions;
