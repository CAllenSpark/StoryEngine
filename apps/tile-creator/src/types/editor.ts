import type { SceneJSON, SceneCollection, TilesetRef, AnimationPhase, GroupAnimationPhase, GroupAnimation, EntityDef } from '@storyengine/shared';
import type { StoredTileset } from '../lib/assetDb.js';

export type Tool = 'paint' | 'erase' | 'select' | 'colorPaint';
export type GameTool = 'collision' | 'spawn' | 'exit' | 'npc';
export type EditorMode = 'art' | 'game';

export interface ValidationMessage {
  level: 'error' | 'warn';
  message: string;
}

export interface SelectionBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Clipboard {
  width: number;
  height: number;
  tiles: number[];
  transforms: number[];
}

export interface StoredAnimation {
  id: string;
  name: string;
  phases: AnimationPhase[];
  createdAt: number;
}

export interface Prefab {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: number[];
  transforms: number[];
  createdAt: number;
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
  selectionBounds: SelectionBounds | null;
  clipboard: Clipboard | null;
  currentFlipH: boolean;
  currentFlipV: boolean;
  prefabLibrary: Prefab[];
  currentColor: string;
  colorTileMap: Record<string, number>;
  animClock: number;
  animationLibrary: StoredAnimation[];
  editingGroupAnimationId: string | null;
  editorMode: EditorMode;
  activeGameTool: GameTool;
  showCollisionOverlay: boolean;
}

export interface EditorActions {
  paintTile: (x: number, y: number) => void;
  eraseTile: (x: number, y: number) => void;
  eraseSelection: () => void;
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
  mergeTileset: (incoming: TilesetState) => void;
  loadScene: (scene: SceneJSON) => void;
  restoreTileset: () => Promise<void>;
  setRotation: (rotation: number) => void;
  rotateTileAt: (x: number, y: number) => void;
  loadLibrary: () => Promise<void>;
  switchTileset: (id: string) => Promise<void>;
  mergeFromLibrary: (id: string) => Promise<void>;
  deleteTilesetFromLibrary: (id: string) => Promise<void>;
  saveTilesetToLibrary: () => Promise<void>;
  createCollection: (name: string) => void;
  addSceneToCollection: (name: string) => void;
  switchScene: (sceneId: string) => void;
  renameScene: (sceneId: string, name: string) => void;
  deleteScene: (sceneId: string) => void;
  saveCollectionToDb: () => Promise<void>;
  loadCollectionFromDb: (id: string) => Promise<void>;
  restoreCollection: () => Promise<void>;
  selectArea: (x1: number, y1: number, x2: number, y2: number) => void;
  copySelection: () => void;
  stampClipboard: (destX: number, destY: number) => void;
  clearSelection: () => void;
  toggleFlipH: () => void;
  toggleFlipV: () => void;
  flipTileAt: (x: number, y: number, axis: 'h' | 'v') => void;
  savePrefabFromClipboard: (name: string) => Promise<void>;
  loadPrefab: (id: string) => Promise<void>;
  deletePrefab: (id: string) => Promise<void>;
  loadPrefabLibrary: () => Promise<void>;
  setColor: (color: string) => void;
  paintColor: (x: number, y: number) => Promise<void>;
  autoTileImage: (image: HTMLImageElement, tileSize: number) => Promise<void>;
  setTileAnimation: (baseTileId: number, phases: AnimationPhase[]) => void;
  removeTileAnimation: (baseTileId: number) => void;
  tickAnimation: () => void;
  saveAnimationToLibrary: (name: string, phases: AnimationPhase[]) => Promise<void>;
  loadAnimationLibrary: () => Promise<void>;
  deleteAnimationFromLibrary: (id: string) => Promise<void>;
  applyLibraryAnimation: (animId: string, baseTileId: number) => void;
  addGroupAnimation: (name: string) => string | null;
  updateGroupAnimation: (id: string, phases: GroupAnimationPhase[]) => void;
  removeGroupAnimation: (id: string) => void;
  captureGroupFrame: (groupId: string) => void;
  setEditorMode: (mode: EditorMode) => void;
  setActiveGameTool: (tool: GameTool) => void;
  toggleCollisionOverlay: () => void;
  paintCollision: (x: number, y: number, blocked: boolean) => void;
  setSpawnPoint: (x: number, y: number) => void;
  addExitZone: (x1: number, y1: number, x2: number, y2: number) => void;
  addNpc: (x: number, y: number) => void;
  removeEntity: (id: string) => void;
  updateEntity: (id: string, patch: Partial<EntityDef>) => void;
  validateScene: () => ValidationMessage[];
}

export type EditorStore = EditorState & EditorActions;
