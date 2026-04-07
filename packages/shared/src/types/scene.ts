export interface AnimationPhase {
  frames: number[];
  speed: number;
  loops?: number;
}

export interface TileAnimation {
  phases: AnimationPhase[];
}

/** Migrate old { frames, speed } format to phased format. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateTileAnimation(raw: any): TileAnimation {
  if (raw && Array.isArray(raw.phases)) return raw as TileAnimation;
  if (raw && Array.isArray(raw.frames) && typeof raw.speed === 'number') {
    return { phases: [{ frames: raw.frames, speed: raw.speed }] };
  }
  return { phases: [] };
}

export interface TilesetRef {
  name: string;
  tileSize: number;
  image: string;
  columns: number;
  animations?: Record<string, TileAnimation>;
}

export interface TileLayer {
  name: string;
  data: number[];
  transforms?: number[];
}

export interface GroupAnimationFrame {
  tiles: number[];
}

export interface GroupAnimationPhase {
  frames: GroupAnimationFrame[];
  speed: number;
  loops?: number;
}

export interface GroupAnimation {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  phases: GroupAnimationPhase[];
  layer: number;
}

export interface SceneJSON {
  version: number;
  width: number;
  height: number;
  tileSize: number;
  layers: TileLayer[];
  tileset: TilesetRef;
  groupAnimations?: GroupAnimation[];
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
