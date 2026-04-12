import type {
  SceneCollection,
  SceneJSON,
  SpriteSheetDef,
  EntityDef,
  TileLayer,
} from '@storyengine/shared';
import type { CollectionBundle } from '../collectionBundle.js';

// ── Deterministic IDs ───────────────────────────────────────────────
// Using fixed IDs means re-generating the sample overwrites the previous
// copy in IndexedDB rather than creating duplicates every first-run.

export const LIGHTHOUSE_COLLECTION_ID = 'lighthouse-sample-v1';
const LIGHTHOUSE_TILESET_ID = 'lighthouse-tileset-v1';
const LIGHTHOUSE_HERO_SHEET_ID = 'lighthouse-hero-v1';

const TILE_SIZE = 16;
const SPRITE_W = 16;
const SPRITE_H = 24;

// ── Tile index constants (match the generated tileset) ──────────────

const T = {
  GRASS: 0,
  STONE: 1,
  WATER: 2,
  TREE: 3,
  WALL: 4,
  DOOR: 5,
  STAIRS: 6,
  LIGHT: 7,
} as const;

// ── Tile renderer ───────────────────────────────────────────────────

/** Draws a single tile's pixels onto ctx at (x, y). */
function drawTile(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number) {
  const ts = TILE_SIZE;
  ctx.save();
  ctx.translate(x, y);
  switch (kind) {
    case T.GRASS: {
      ctx.fillStyle = '#4a7c3a';
      ctx.fillRect(0, 0, ts, ts);
      // a few darker blades
      ctx.fillStyle = '#3a6b2a';
      ctx.fillRect(3, 4, 1, 2);
      ctx.fillRect(8, 9, 1, 2);
      ctx.fillRect(12, 5, 1, 2);
      ctx.fillRect(5, 12, 1, 2);
      break;
    }
    case T.STONE: {
      ctx.fillStyle = '#8a8785';
      ctx.fillRect(0, 0, ts, ts);
      ctx.fillStyle = '#6e6b69';
      ctx.fillRect(0, 0, ts, 1);
      ctx.fillRect(0, 0, 1, ts);
      ctx.fillStyle = '#a5a3a0';
      ctx.fillRect(ts - 1, 1, 1, ts - 1);
      ctx.fillRect(1, ts - 1, ts - 1, 1);
      // cracks
      ctx.fillStyle = '#6e6b69';
      ctx.fillRect(7, 3, 1, 4);
      ctx.fillRect(3, 10, 3, 1);
      break;
    }
    case T.WATER: {
      ctx.fillStyle = '#3a6ba8';
      ctx.fillRect(0, 0, ts, ts);
      ctx.fillStyle = '#5a8bc8';
      ctx.fillRect(2, 3, 4, 1);
      ctx.fillRect(9, 6, 5, 1);
      ctx.fillRect(4, 10, 6, 1);
      ctx.fillRect(10, 13, 4, 1);
      break;
    }
    case T.TREE: {
      // grass base
      drawTile(ctx, T.GRASS, 0, 0);
      // trunk
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(7, 10, 2, 5);
      // canopy
      ctx.fillStyle = '#2a5a1a';
      ctx.fillRect(4, 2, 8, 8);
      ctx.fillStyle = '#3a7a2a';
      ctx.fillRect(5, 3, 6, 3);
      break;
    }
    case T.WALL: {
      ctx.fillStyle = '#b0ada5';
      ctx.fillRect(0, 0, ts, ts);
      ctx.fillStyle = '#8a8785';
      for (let row = 0; row < 4; row++) {
        ctx.fillRect(0, row * 4 + 3, ts, 1);
        const off = row % 2 === 0 ? 0 : 4;
        ctx.fillRect(off, row * 4, 1, 4);
        ctx.fillRect(off + 8, row * 4, 1, 4);
      }
      break;
    }
    case T.DOOR: {
      ctx.fillStyle = '#b0ada5';
      ctx.fillRect(0, 0, ts, ts);
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(3, 2, 10, 14);
      ctx.fillStyle = '#3a2310';
      ctx.fillRect(3, 2, 10, 1);
      ctx.fillRect(3, 2, 1, 14);
      ctx.fillStyle = '#f9e2af';
      ctx.fillRect(10, 9, 1, 2);
      break;
    }
    case T.STAIRS: {
      ctx.fillStyle = '#6e6b69';
      ctx.fillRect(0, 0, ts, ts);
      ctx.fillStyle = '#a5a3a0';
      ctx.fillRect(0, 2, ts, 2);
      ctx.fillRect(0, 7, ts, 2);
      ctx.fillRect(0, 12, ts, 2);
      ctx.fillStyle = '#3a3836';
      ctx.fillRect(0, 4, ts, 1);
      ctx.fillRect(0, 9, ts, 1);
      ctx.fillRect(0, 14, ts, 1);
      break;
    }
    case T.LIGHT: {
      ctx.fillStyle = '#3a3630';
      ctx.fillRect(0, 0, ts, ts);
      // glow
      ctx.fillStyle = '#f9e2af';
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = '#fab387';
      ctx.fillRect(6, 6, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(7, 7, 2, 2);
      break;
    }
  }
  ctx.restore();
}

/** Build a 4×2 tileset PNG as a data URL. Tiles laid out left-to-right, top-to-bottom. */
function generateTilesetDataUrl(): string {
  const columns = 4;
  const rows = 2;
  const tilesetOrder = [T.GRASS, T.STONE, T.WATER, T.TREE, T.WALL, T.DOOR, T.STAIRS, T.LIGHT];
  const canvas = document.createElement('canvas');
  canvas.width = columns * TILE_SIZE;
  canvas.height = rows * TILE_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < tilesetOrder.length; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    drawTile(ctx, tilesetOrder[i], col * TILE_SIZE, row * TILE_SIZE);
  }
  return canvas.toDataURL('image/png');
}

// ── Sprite renderer ─────────────────────────────────────────────────

/**
 * Draw a single hero frame at (x, y).
 * `facing`: 'down' | 'up' | 'left' | 'right'
 * `legPhase`: 0..3 for walk-cycle foot position (0,2 = stand; 1 = step-L; 3 = step-R)
 */
function drawHeroFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: 'down' | 'up' | 'left' | 'right',
  legPhase: number,
) {
  ctx.save();
  ctx.translate(x, y);

  // Head
  ctx.fillStyle = '#f5d0a9';
  ctx.fillRect(5, 2, 6, 6);
  // Hair cap (direction-aware: show more on the front/top)
  ctx.fillStyle = '#3a2a20';
  ctx.fillRect(5, 2, 6, 2);
  if (facing === 'up') ctx.fillRect(5, 2, 6, 3);
  if (facing === 'left') { ctx.fillRect(5, 2, 2, 6); }
  if (facing === 'right') { ctx.fillRect(9, 2, 2, 6); }

  // Eyes (only when facing down/left/right, and not too stylized for up)
  ctx.fillStyle = '#1e1e2e';
  if (facing === 'down') {
    ctx.fillRect(6, 5, 1, 1);
    ctx.fillRect(9, 5, 1, 1);
  } else if (facing === 'left') {
    ctx.fillRect(6, 5, 1, 1);
  } else if (facing === 'right') {
    ctx.fillRect(9, 5, 1, 1);
  }

  // Body (tunic)
  ctx.fillStyle = '#5e8bc8';
  ctx.fillRect(4, 8, 8, 8);

  // Belt
  ctx.fillStyle = '#3a2a20';
  ctx.fillRect(4, 14, 8, 1);

  // Arms
  ctx.fillStyle = '#5e8bc8';
  ctx.fillRect(3, 9, 1, 5);
  ctx.fillRect(12, 9, 1, 5);
  // Hands
  ctx.fillStyle = '#f5d0a9';
  ctx.fillRect(3, 13, 1, 1);
  ctx.fillRect(12, 13, 1, 1);

  // Legs — leg phase 0 and 2 are "stand", 1 and 3 are stepping
  const leftOffset = legPhase === 1 ? -1 : legPhase === 3 ? 1 : 0;
  const rightOffset = legPhase === 1 ? 1 : legPhase === 3 ? -1 : 0;
  ctx.fillStyle = '#3a2a20';
  ctx.fillRect(5, 16, 2, 6 + leftOffset);
  ctx.fillRect(9, 16, 2, 6 + rightOffset);
  // Boots
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(5, 21 + leftOffset, 2, 2 - (leftOffset < 0 ? -leftOffset : 0));
  ctx.fillRect(9, 21 + rightOffset, 2, 2 - (rightOffset < 0 ? -rightOffset : 0));

  ctx.restore();
}

/**
 * Build the hero sprite sheet: 4 columns × 8 rows at 16×24 per cell.
 * Rows: idle-down, walk-down, idle-up, walk-up, idle-left, walk-left, idle-right, walk-right.
 */
function generateHeroDataUrl(): string {
  const columns = 4;
  const rows = 8;
  const canvas = document.createElement('canvas');
  canvas.width = columns * SPRITE_W;
  canvas.height = rows * SPRITE_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const layout: Array<{ facing: 'down' | 'up' | 'left' | 'right'; row: number; frames: number }> = [
    { facing: 'down', row: 0, frames: 1 },   // idle-down
    { facing: 'down', row: 1, frames: 4 },   // walk-down
    { facing: 'up', row: 2, frames: 1 },     // idle-up
    { facing: 'up', row: 3, frames: 4 },     // walk-up
    { facing: 'left', row: 4, frames: 1 },   // idle-left
    { facing: 'left', row: 5, frames: 4 },   // walk-left
    { facing: 'right', row: 6, frames: 1 },  // idle-right
    { facing: 'right', row: 7, frames: 4 },  // walk-right
  ];

  for (const { facing, row, frames } of layout) {
    for (let frame = 0; frame < frames; frame++) {
      // Walk cycle phases: 0=stand, 1=step-L, 2=stand, 3=step-R
      const phase = frames === 1 ? 0 : frame;
      drawHeroFrame(ctx, frame * SPRITE_W, row * SPRITE_H, facing, phase);
    }
  }

  return canvas.toDataURL('image/png');
}

function buildHeroSheetDef(): SpriteSheetDef {
  return {
    id: LIGHTHOUSE_HERO_SHEET_ID,
    name: 'Hero',
    frameWidth: SPRITE_W,
    frameHeight: SPRITE_H,
    columns: 4,
    rows: 8,
    defaultState: 'idle-down',
    states: [
      { name: 'idle-down', row: 0, colStart: 0, frameCount: 1, fps: 2, loop: true },
      { name: 'walk-down', row: 1, colStart: 0, frameCount: 4, fps: 8, loop: true },
      { name: 'idle-up', row: 2, colStart: 0, frameCount: 1, fps: 2, loop: true },
      { name: 'walk-up', row: 3, colStart: 0, frameCount: 4, fps: 8, loop: true },
      { name: 'idle-left', row: 4, colStart: 0, frameCount: 1, fps: 2, loop: true },
      { name: 'walk-left', row: 5, colStart: 0, frameCount: 4, fps: 8, loop: true },
      { name: 'idle-right', row: 6, colStart: 0, frameCount: 1, fps: 2, loop: true },
      { name: 'walk-right', row: 7, colStart: 0, frameCount: 4, fps: 8, loop: true },
    ],
  };
}

// ── Scene builders ──────────────────────────────────────────────────

/** Layer helper: makes a layer filled with `-1` (empty), then applies patches. */
function buildLayer(
  name: string,
  width: number,
  height: number,
  patches: Array<{ x: number; y: number; w?: number; h?: number; tile: number }>,
  baseFill?: number,
): TileLayer {
  const data = new Array(width * height).fill(baseFill ?? -1);
  for (const p of patches) {
    const w = p.w ?? 1;
    const h = p.h ?? 1;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const x = p.x + dx;
        const y = p.y + dy;
        if (x >= 0 && x < width && y >= 0 && y < height) {
          data[y * width + x] = p.tile;
        }
      }
    }
  }
  return { name, data };
}

/** Builds a collision layer (0 = walkable, 1 = blocked). */
function buildCollisionLayer(
  width: number,
  height: number,
  blocked: Array<{ x: number; y: number; w?: number; h?: number }>,
): number[] {
  const data = new Array(width * height).fill(0);
  for (const b of blocked) {
    const w = b.w ?? 1;
    const h = b.h ?? 1;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const x = b.x + dx;
        const y = b.y + dy;
        if (x >= 0 && x < width && y >= 0 && y < height) {
          data[y * width + x] = 1;
        }
      }
    }
  }
  return data;
}

function buildCliffsideScene(sceneId: string, interiorSceneId: string): SceneJSON {
  const W = 12;
  const H = 9;

  const base = buildLayer('base', W, H, [
    // Water on the left two columns
    { x: 0, y: 0, w: 2, h: H, tile: T.WATER },
    // Path of stone from the water's edge to the lighthouse
    { x: 2, y: 7, tile: T.STONE },
    { x: 3, y: 7, tile: T.STONE },
    { x: 4, y: 7, tile: T.STONE },
    { x: 5, y: 6, tile: T.STONE },
    { x: 6, y: 5, tile: T.STONE },
    { x: 7, y: 4, tile: T.STONE },
    { x: 8, y: 3, tile: T.STONE },
    { x: 9, y: 3, tile: T.STONE },
    // A few trees for atmosphere
    { x: 3, y: 2, tile: T.TREE },
    { x: 4, y: 5, tile: T.TREE },
    { x: 8, y: 7, tile: T.TREE },
    { x: 10, y: 6, tile: T.TREE },
  ], T.GRASS);

  // Collision: all water tiles + all trees
  const collision = buildCollisionLayer(W, H, [
    { x: 0, y: 0, w: 2, h: H },
    { x: 3, y: 2 },
    { x: 4, y: 5 },
    { x: 8, y: 7 },
    { x: 10, y: 6 },
  ]);

  const entities: EntityDef[] = [
    {
      id: 'lighthouse-spawn',
      type: 'spawn',
      x: 2, y: 7,
      properties: { spriteSheetId: LIGHTHOUSE_HERO_SHEET_ID },
    },
    {
      id: 'lighthouse-hermit',
      type: 'npc',
      x: 6, y: 6,
      properties: {
        name: 'Hermit',
        spriteSheetId: LIGHTHOUSE_HERO_SHEET_ID,
        dialogue: [
          { speaker: 'Hermit', text: 'Oh! You found the path to the lighthouse.' },
          { speaker: 'Hermit', text: 'Climb to the top. See what it has to show you.' },
          { speaker: 'Hermit', text: 'I will wait here. Stories are for the ones who find them.' },
        ],
      },
    },
    {
      id: 'lighthouse-hermit-flag',
      type: 'action',
      x: 6, y: 6,
      properties: {
        action: {
          trigger: 'interact',
          radius: 1,
          oneShot: true,
          steps: [
            { type: 'changePlayerState', params: { flag: 'metHermit', value: true } },
          ],
        },
      },
    },
    {
      id: 'lighthouse-exit-to-interior',
      type: 'exit',
      x: 9, y: 3,
      properties: {
        targetSceneId: interiorSceneId,
        spawnX: 5,
        spawnY: 7,
      },
    },
  ];

  return {
    version: 1,
    width: W,
    height: H,
    tileSize: TILE_SIZE,
    layers: [base],
    tileset: {
      name: 'Lighthouse',
      tileSize: TILE_SIZE,
      image: 'lighthouse-tileset.png',
      columns: 4,
    },
    collisionLayer: collision,
    entities,
  };
}

function buildLighthouseTopScene(sceneId: string): SceneJSON {
  const W = 10;
  const H = 8;

  // Stone floor everywhere with wall around the perimeter and a light at the top
  const base = buildLayer('base', W, H, [
    // Outer walls
    { x: 0, y: 0, w: W, h: 1, tile: T.WALL },
    { x: 0, y: H - 1, w: W, h: 1, tile: T.WALL },
    { x: 0, y: 0, w: 1, h: H, tile: T.WALL },
    { x: W - 1, y: 0, w: 1, h: H, tile: T.WALL },
    // Light at the top center
    { x: 4, y: 1, w: 2, h: 2, tile: T.LIGHT },
    // Stairs arriving at the bottom center
    { x: 4, y: H - 1, tile: T.STAIRS },
    { x: 5, y: H - 1, tile: T.STAIRS },
  ], T.STONE);

  // Everything not walkable: walls + the light itself
  const collision = buildCollisionLayer(W, H, [
    { x: 0, y: 0, w: W, h: 1 },
    { x: 0, y: H - 1, w: W, h: 1 },
    { x: 0, y: 0, w: 1, h: H },
    { x: W - 1, y: 0, w: 1, h: H },
    { x: 4, y: 1, w: 2, h: 2 },
  ]);

  const entities: EntityDef[] = [
    // No spawn entity — this scene is entered via the exit from Cliffside.
    // Step-trigger action near the light: ends the adventure.
    {
      id: 'lighthouse-top-ending',
      type: 'action',
      x: 4, y: 3,
      properties: {
        action: {
          trigger: 'step',
          radius: 1,
          oneShot: true,
          steps: [
            { type: 'showDialogue', params: {
              lines: [
                { speaker: '', text: 'The light warms your face as you step close.' },
                { speaker: '', text: 'You remember the hermit\'s words — "stories are for the ones who find them".' },
              ],
            }},
            { type: 'endAdventure', params: {
              message: 'You climbed the lighthouse and found a story worth telling. Well done.',
            }},
          ],
        },
      },
    },
  ];

  return {
    version: 1,
    width: W,
    height: H,
    tileSize: TILE_SIZE,
    layers: [base],
    tileset: {
      name: 'Lighthouse',
      tileSize: TILE_SIZE,
      image: 'lighthouse-tileset.png',
      columns: 4,
    },
    collisionLayer: collision,
    entities,
  };
}

// ── Public: build the full bundle ───────────────────────────────────

/**
 * Generate the Lighthouse sample collection bundle.
 * This renders the pixel art to data URLs and assembles scenes + assets
 * into a CollectionBundle ready to import via the store's
 * `importCollectionBundle` action.
 */
export function generateLighthouseBundle(): CollectionBundle {
  const cliffsideId = 'lighthouse-cliffside';
  const topId = 'lighthouse-top';

  const collection: SceneCollection = {
    id: LIGHTHOUSE_COLLECTION_ID,
    name: 'The Lighthouse',
    activeTilesetId: LIGHTHOUSE_TILESET_ID,
    scenes: [
      {
        id: cliffsideId,
        name: 'Cliffside',
        scene: buildCliffsideScene(cliffsideId, topId),
      },
      {
        id: topId,
        name: 'Lighthouse Top',
        scene: buildLighthouseTopScene(topId),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const tilesetDataUrl = generateTilesetDataUrl();
  const heroDataUrl = generateHeroDataUrl();
  const heroDef = buildHeroSheetDef();

  return {
    version: 3,
    kind: 'collection-bundle',
    exportedAt: Date.now(),
    collection,
    tilesets: {
      [LIGHTHOUSE_TILESET_ID]: {
        id: LIGHTHOUSE_TILESET_ID,
        name: 'Lighthouse',
        filename: 'lighthouse-tileset.png',
        dataUrl: tilesetDataUrl,
        tileSize: TILE_SIZE,
        columns: 4,
      },
    },
    spriteSheets: {
      [LIGHTHOUSE_HERO_SHEET_ID]: {
        def: heroDef,
        dataUrl: heroDataUrl,
      },
    },
  };
}
