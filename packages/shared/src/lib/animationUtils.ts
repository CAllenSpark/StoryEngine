/**
 * Resolve the current frame index for a phased animation given an elapsed clock.
 * Works for both single-tile and group animations.
 * Returns { phaseIndex, frameIndex } or null if the animation has no valid phases.
 */
export function resolvePhaseFrame(
  phases: readonly { readonly frames: readonly unknown[]; readonly speed: number; readonly loops?: number }[],
  clock: number,
): { phaseIndex: number; frameIndex: number } | null {
  if (phases.length === 0) return null;

  let remaining = clock;
  for (let pi = 0; pi < phases.length; pi++) {
    const phase = phases[pi];
    if (phase.frames.length === 0) continue;
    const frameDuration = 1000 / phase.speed;
    const cycleDuration = frameDuration * phase.frames.length;

    if (phase.loops !== undefined) {
      const totalTime = cycleDuration * phase.loops;
      if (remaining < totalTime) {
        return { phaseIndex: pi, frameIndex: Math.floor((remaining % cycleDuration) / frameDuration) };
      }
      remaining -= totalTime;
    } else {
      return { phaseIndex: pi, frameIndex: Math.floor((remaining % cycleDuration) / frameDuration) };
    }
  }

  // All finite phases exhausted — hold last frame of last phase
  for (let pi = phases.length - 1; pi >= 0; pi--) {
    if (phases[pi].frames.length > 0) {
      return { phaseIndex: pi, frameIndex: phases[pi].frames.length - 1 };
    }
  }
  return null;
}
