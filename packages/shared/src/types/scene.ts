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

export interface EntityBase {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

/** Entity types for discriminated union — used for narrowing via `entity.type`. */
export type EntityType = 'spawn' | 'npc' | 'exit' | 'action';

// EntityDef is defined below ActionDef / DialogueLine as a discriminated union.

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
  | 'playActorAnimation'
  | 'endAdventure';

export interface ActionStep {
  type: ActionType;
  params: Record<string, unknown>;
}

export interface ActionDef {
  trigger: ActionTrigger;
  condition?: { flag?: string; item?: string };
  steps: ActionStep[];
  oneShot?: boolean;
  /** Trigger radius in tiles (0 = same tile only, 1 = adjacent, etc.) */
  radius?: number;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

// ── Entity discriminated union ──────────────────────────────────────

export interface SpawnEntity extends EntityBase {
  type: 'spawn';
  properties?: {
    spriteSheetId?: string;
    [key: string]: unknown;
  };
}

export interface NpcEntity extends EntityBase {
  type: 'npc';
  properties?: {
    name?: string;
    dialogue?: DialogueLine[];
    spriteSheetId?: string;
    [key: string]: unknown;
  };
}

export interface ExitEntity extends EntityBase {
  type: 'exit';
  properties?: {
    targetSceneId?: string;
    spawnX?: number;
    spawnY?: number;
    [key: string]: unknown;
  };
}

export interface ActionEntity extends EntityBase {
  type: 'action';
  properties?: {
    action?: ActionDef;
    [key: string]: unknown;
  };
}

/**
 * Scene entity — discriminated union by `type`.
 * TypeScript narrows `entity.properties` automatically when you check `entity.type`.
 * The `[key: string]: unknown` escape hatch preserves forward compatibility with
 * future fields while giving known fields proper typing.
 */
export type EntityDef = SpawnEntity | NpcEntity | ExitEntity | ActionEntity;

// Type predicates for filter() narrowing.
export const isSpawn = (e: EntityDef): e is SpawnEntity => e.type === 'spawn';
export const isNpc = (e: EntityDef): e is NpcEntity => e.type === 'npc';
export const isExit = (e: EntityDef): e is ExitEntity => e.type === 'exit';
export const isAction = (e: EntityDef): e is ActionEntity => e.type === 'action';

// ── Sprite animation types ──────────────────────────────────────────

/** A named animation state within a spritesheet (e.g. "walk-down"). */
export interface SpriteAnimState {
  /** State name. Convention: "{action}-{facing}" like "walk-down", or just "{action}" like "interact". */
  name: string;
  /** Row index in the spritesheet grid (0-based). */
  row: number;
  /** Starting column within the row where this state's frames begin. */
  colStart: number;
  /** Number of frames in this state. */
  frameCount: number;
  /** Animation speed in frames per second. */
  fps: number;
  /** Whether the animation loops. Default true. */
  loop?: boolean;
}

/** A character spritesheet definition — uniform grid of frames with named states. */
export interface SpriteSheetDef {
  /** Unique ID. */
  id: string;
  /** Human-readable name (e.g. "Hero", "Villager"). */
  name: string;
  /** Width of one frame in pixels. */
  frameWidth: number;
  /** Height of one frame in pixels. */
  frameHeight: number;
  /** Columns in the grid. */
  columns: number;
  /** Rows in the grid. */
  rows: number;
  /** Named animation states. */
  states: SpriteAnimState[];
  /** Default state name when idle (e.g. "idle-down"). */
  defaultState: string;
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
  /** Sprite sheet definitions used by entities in this collection. */
  spriteSheets?: SpriteSheetDef[];
  createdAt: number;
  updatedAt: number;
}

export interface CollectionExport {
  version: 2;
  collection: SceneCollection;
}
