import type { TileLayer, TileAnimation } from '@storyengine/shared';
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
      // Skip single-phase single-frame animations
      if (anim.phases.length === 1 && anim.phases[0].frames.length < 2) continue;
      const id = Number(key);
      this.animations.set(id, anim);
      this.animStates.set(id, {
        currentPhase: 0,
        loopsCompleted: 0,
        frameIndex: 0,
        phaseAccum: 0,
        finished: false,
      });
    }
  }

  updateAnimations(dt: number): void {
    if (this.animations.size === 0) return;
    for (const [baseTileId, anim] of this.animations) {
      const state = this.animStates.get(baseTileId)!;
      if (state.finished) continue;

      const phase = anim.phases[state.currentPhase];
      if (!phase || phase.frames.length === 0) {
        state.finished = true;
        continue;
      }

      state.phaseAccum += dt;
      const frameDuration = 1000 / phase.speed;
      const phaseCycleDuration = frameDuration * phase.frames.length;

      if (phase.loops !== undefined) {
        // Finite loops
        const totalPhaseTime = phaseCycleDuration * phase.loops;
        if (state.phaseAccum >= totalPhaseTime) {
          // Phase complete — advance to next or finish
          if (state.currentPhase + 1 < anim.phases.length) {
            state.currentPhase++;
            state.phaseAccum = state.phaseAccum - totalPhaseTime;
            state.loopsCompleted = 0;
            state.frameIndex = 0;
          } else {
            // Last phase done — hold final frame
            state.finished = true;
            state.frameIndex = phase.frames.length - 1;
          }
        } else {
          const t = state.phaseAccum % phaseCycleDuration;
          state.frameIndex = Math.floor(t / frameDuration);
        }
      } else {
        // Infinite loop
        const t = state.phaseAccum % phaseCycleDuration;
        state.frameIndex = Math.floor(t / frameDuration);
      }
    }
  }

  resolveAnimatedTile(tileId: number): number {
    const anim = this.animations.get(tileId);
    if (!anim) return tileId;
    const state = this.animStates.get(tileId);
    if (!state) return tileId;
    const phase = anim.phases[state.currentPhase];
    if (!phase) return tileId;
    return phase.frames[state.frameIndex] ?? tileId;
  }

  get hasAnimations(): boolean {
    return this.animations.size > 0;
  }
}
