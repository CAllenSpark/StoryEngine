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

export interface EntityDef {
  id: string;
  type: 'spawn' | 'npc' | 'exit' | 'action';
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: Record<string, unknown>;
}

export type ActionTrigger = 'step' | 'interact' | 'auto' | 'conditional';

export type ActionType =
  | 'showDialogue'
  | 'playGroupAnimation'
  | 'changeScene'
  | 'playVideo'
  | 'playAudio'
  | 'stopAudio'
  | 'showImage'
  | 'showSlideshow'
  | 'playerInput'
  | 'changePlayerState'
  | 'playActorAnimation';

export interface ActionStep {
  type: ActionType;
  params: Record<string, unknown>;
}

export interface ActionDef {
  trigger: ActionTrigger;
  condition?: { flag?: string; item?: string };
  steps: ActionStep[];
  oneShot?: boolean;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface SceneConnection {
  direction: string;
  targetSceneId: string;
  spawnX: number;
  spawnY: number;
}

export interface SceneJSON {
  version: number;
  width: number;
  height: number;
  tileSize: number;
  layers: TileLayer[];
  tileset: TilesetRef;
  groupAnimations?: GroupAnimation[];
  collisionLayer?: number[];
  entities?: EntityDef[];
}

export interface SceneEntry {
  id: string;
  name: string;
  scene: SceneJSON;
  connections?: SceneConnection[];
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
