import type { TileLayer, TileAnimation, GroupAnimation, GroupAnimationPhase } from '@storyengine/shared';
import { migrateTileAnimation } from '@storyengine/shared';

interface AnimInstanceState {
  currentPhase: number;
  loopsCompleted: number;
  frameIndex: number;
  phaseAccum: number;
  finished: boolean;
}

export class Tilemap {
  private animations: Map<number, TileAnimation> = new Map();
  private animStates: Map<number, AnimInstanceState> = new Map();
  private groupAnims: GroupAnimation[] = [];
  private groupStates: Map<string, AnimInstanceState> = new Map();
  private groupOverlay: Map<string, number> = new Map();

  constructor(
    readonly width: number,
    readonly height: number,
    readonly tileSize: number,
    readonly layers: TileLayer[],
  ) {}

  get pixelWidth(): number {
    return this.width * this.tileSize;
  }

  get pixelHeight(): number {
    return this.height * this.tileSize;
  }

  getTile(layerIndex: number, x: number, y: number): number {
    const layer = this.layers[layerIndex];
    if (!layer || x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
    return layer.data[y * this.width + x] ?? -1;
  }

  setAnimations(anims: Record<string, TileAnimation> | undefined): void {
    this.animations.clear();
    this.animStates.clear();
    if (!anims) return;
    for (const [key, raw] of Object.entries(anims)) {
      const anim = migrateTileAnimation(raw);
      if (anim.phases.length === 0) continue;
      if (anim.phases.length === 1 && anim.phases[0].frames.length < 2) continue;
      const id = Number(key);
      this.animations.set(id, anim);
      this.animStates.set(id, newAnimState());
    }
  }

  setGroupAnimations(groups: GroupAnimation[] | undefined): void {
    this.groupAnims = groups ?? [];
    this.groupStates.clear();
    this.groupOverlay.clear();
    for (const g of this.groupAnims) {
      if (g.phases.length === 0) continue;
      this.groupStates.set(g.id, newAnimState());
    }
  }

  updateAnimations(dt: number): void {
    // Per-tile animations
    for (const [, anim] of this.animations) {
      // Find state by iterating (we need baseTileId as key)
    }
    for (const [baseTileId, anim] of this.animations) {
      const state = this.animStates.get(baseTileId)!;
      advancePhased(state, anim.phases.map((p) => ({ frameCount: p.frames.length, speed: p.speed, loops: p.loops })), dt);
    }

    // Group animations — rebuild overlay
    this.groupOverlay.clear();
    for (const g of this.groupAnims) {
      const state = this.groupStates.get(g.id);
      if (!state) continue;
      advancePhased(state, g.phases.map((p) => ({ frameCount: p.frames.length, speed: p.speed, loops: p.loops })), dt);

      const phase = g.phases[state.currentPhase];
      if (!phase) continue;
      const frame = phase.frames[state.frameIndex];
      if (!frame) continue;

      for (let gy = 0; gy < g.height; gy++) {
        for (let gx = 0; gx < g.width; gx++) {
          const tileId = frame.tiles[gy * g.width + gx];
          if (tileId !== undefined && tileId >= 0) {
            this.groupOverlay.set(`${g.x + gx},${g.y + gy}:${g.layer}`, tileId);
          }
        }
      }
    }
  }

  resolveAnimatedTile(tileId: number, x?: number, y?: number, layerIndex?: number): number {
    if (x !== undefined && y !== undefined && layerIndex !== undefined) {
      const groupTile = this.groupOverlay.get(`${x},${y}:${layerIndex}`);
      if (groupTile !== undefined) return groupTile;
    }
    const anim = this.animations.get(tileId);
    if (!anim) return tileId;
    const state = this.animStates.get(tileId);
    if (!state) return tileId;
    const phase = anim.phases[state.currentPhase];
    if (!phase) return tileId;
    return phase.frames[state.frameIndex] ?? tileId;
  }

  get hasAnimations(): boolean {
    return this.animations.size > 0 || this.groupAnims.length > 0;
  }
}

function newAnimState(): AnimInstanceState {
  return { currentPhase: 0, loopsCompleted: 0, frameIndex: 0, phaseAccum: 0, finished: false };
}

function advancePhased(
  state: AnimInstanceState,
  phases: { frameCount: number; speed: number; loops?: number }[],
  dt: number,
): void {
  if (state.finished) return;
  const phase = phases[state.currentPhase];
  if (!phase || phase.frameCount === 0) { state.finished = true; return; }

  state.phaseAccum += dt;
  const frameDuration = 1000 / phase.speed;
  const cycleDuration = frameDuration * phase.frameCount;

  if (phase.loops !== undefined) {
    const totalTime = cycleDuration * phase.loops;
    if (state.phaseAccum >= totalTime) {
      if (state.currentPhase + 1 < phases.length) {
        state.currentPhase++;
        state.phaseAccum -= totalTime;
        state.loopsCompleted = 0;
        state.frameIndex = 0;
      } else {
        state.finished = true;
        state.frameIndex = phase.frameCount - 1;
      }
    } else {
      state.frameIndex = Math.floor((state.phaseAccum % cycleDuration) / frameDuration);
    }
  } else {
    state.frameIndex = Math.floor((state.phaseAccum % cycleDuration) / frameDuration);
  }
}
