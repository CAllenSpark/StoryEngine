import type { SceneJSON, SceneCollection, TilesetRef } from '@storyengine/shared';
import type { StoredTileset } from '../lib/assetDb.js';

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
  currentRotation: number;
  tilesetLibrary: StoredTileset[];
  currentTilesetId: string | null;
  currentCollection: SceneCollection | null;
  currentSceneId: string | null;
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
  setRotation: (rotation: number) => void;
  rotateTileAt: (x: number, y: number) => void;
  loadLibrary: () => Promise<void>;
  switchTileset: (id: string) => Promise<void>;
  deleteTilesetFromLibrary: (id: string) => Promise<void>;
  saveTilesetToLibrary: () => Promise<void>;
  createCollection: (name: string) => void;
  addSceneToCollection: (name: string) => void;
  switchScene: (sceneId: string) => void;
  renameScene: (sceneId: string, name: string) => void;
  deleteScene: (sceneId: string) => void;
  saveCollectionToDb: () => Promise<void>;
  loadCollectionFromDb: (id: string) => Promise<void>;
}

export type EditorStore = EditorState & EditorActions;
