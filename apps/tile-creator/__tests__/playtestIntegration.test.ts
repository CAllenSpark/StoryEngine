import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SceneJSON, EntityDef, ActionDef } from '@storyengine/shared';
import { isSpawn, isExit, isNpc, isAction } from '@storyengine/shared';
import { loadTilemap } from '@storyengine/engine';
import { runActionSteps, canTriggerAction, type StepHandlerContext } from '../src/hooks/playtest/actionHandlers.js';
import { resolveActorState, advanceActorAnim } from '../src/hooks/playtest/actorAnimations.js';
import type { PlaytestState } from '../src/hooks/playtest/types.js';

// Stub canvas for the Lighthouse sample generator
beforeEach(() => {
  const stubCtx = {
    imageSmoothingEnabled: false, fillStyle: '', fillRect: () => {},
    save: () => {}, restore: () => {}, translate: () => {},
  };
  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag === 'canvas') return {
        width: 0, height: 0,
        getContext: () => stubCtx,
        toDataURL: () => 'data:image/png;base64,STUB',
      };
      throw new Error(`Unsupported: ${tag}`);
    },
  });
});

function freshState(): PlaytestState {
  return {
    px: 0, py: 0, facing: 'down',
    sceneId: '', dialogue: null, dialogueIndex: 0,
    running: true, firedActions: new Set(), flags: {},
    media: null, audio: null, lastChoice: null,
    ended: false, endMessage: null,
  };
}

/**
 * Simulate the core playtest update loop for one scene.
 * This covers: collision, step triggers, exit zones, and action execution —
 * the key integration path that the React hook orchestrates.
 */
function simulatePlayerMovement(
  scene: SceneJSON,
  state: PlaytestState,
  targetX: number,
  targetY: number,
  maxTicks = 500,
): { sceneChanges: Array<{ sceneId: string; sx?: number; sy?: number }> } {
  const tilemap = loadTilemap(scene);
  const ts = scene.tileSize;
  const speed = 80; // px/s (matches usePlaytest PLAYER_SPEED)
  const dt = 1000 / 60; // 16.67ms per tick

  const entities = scene.entities ?? [];
  const stepActions = entities.filter(isAction).filter(
    (a) => a.properties?.action?.trigger === 'step',
  );
  const exits = entities.filter(isExit);

  const sceneChanges: Array<{ sceneId: string; sx?: number; sy?: number }> = [];

  for (let tick = 0; tick < maxTicks; tick++) {
    if (state.ended) break;

    // Simple movement toward target (no diagonal normalization needed for this test)
    const dx = targetX * ts + ts / 2 - state.px;
    const dy = targetY * ts + ts / 2 - state.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) break; // arrived

    const dtSec = dt / 1000;
    const moveX = dist > 0 ? (dx / dist) * speed * dtSec : 0;
    const moveY = dist > 0 ? (dy / dist) * speed * dtSec : 0;

    // Axis-separated collision (matching usePlaytest logic)
    const newPx = state.px + moveX;
    const testTileX = Math.floor(newPx / ts);
    if (tilemap.isWalkable(testTileX, Math.floor(state.py / ts))) {
      state.px = Math.max(ts / 2, Math.min(tilemap.pixelWidth - ts / 2, newPx));
    }
    const newPy = state.py + moveY;
    const testTileY = Math.floor(newPy / ts);
    if (tilemap.isWalkable(Math.floor(state.px / ts), testTileY)) {
      state.py = Math.max(ts / 2, Math.min(tilemap.pixelHeight - ts / 2, newPy));
    }

    // Update facing
    if (Math.abs(dx) > Math.abs(dy)) {
      state.facing = dx > 0 ? 'right' : 'left';
    } else if (dy !== 0) {
      state.facing = dy > 0 ? 'down' : 'up';
    }

    // Check step triggers
    const playerTileX = Math.floor(state.px / ts);
    const playerTileY = Math.floor(state.py / ts);
    for (const ent of stepActions) {
      const action = ent.properties?.action;
      if (!action) continue;
      const radius = action.radius ?? 0;
      const entDist = Math.max(Math.abs(ent.x - playerTileX), Math.abs(ent.y - playerTileY));
      if (entDist <= radius) {
        if (action.oneShot && state.firedActions.has(ent.id)) continue;
        if (!canTriggerAction(action, state)) continue;
        if (action.oneShot) state.firedActions.add(ent.id);
        const ctx: StepHandlerContext = {
          state,
          requestSceneChange: (sceneId, sx, sy) => {
            sceneChanges.push({ sceneId, sx, sy });
          },
        };
        runActionSteps(action.steps, ctx);
      }
    }

    // Check exit zones
    for (const exit of exits) {
      const ew = exit.width ?? 1;
      const eh = exit.height ?? 1;
      if (playerTileX >= exit.x && playerTileX < exit.x + ew &&
          playerTileY >= exit.y && playerTileY < exit.y + eh) {
        const targetId = exit.properties?.targetSceneId;
        if (targetId) {
          sceneChanges.push({
            sceneId: targetId,
            sx: exit.properties?.spawnX,
            sy: exit.properties?.spawnY,
          });
          return { sceneChanges };
        }
      }
    }
  }

  return { sceneChanges };
}

describe('Lighthouse integration — full adventure walkthrough', () => {
  let scenes: Map<string, SceneJSON>;
  let cliffsideId: string;
  let topId: string;

  beforeEach(async () => {
    const { generateLighthouseBundle } = await import('../src/lib/sampleCollections/lighthouse.js');
    const bundle = generateLighthouseBundle();
    scenes = new Map(bundle.collection.scenes.map((s) => [s.id, s.scene]));
    cliffsideId = bundle.collection.scenes[0].id;
    topId = bundle.collection.scenes[1].id;
  });

  it('player spawns at the correct position', () => {
    const scene = scenes.get(cliffsideId)!;
    const spawn = (scene.entities ?? []).find(isSpawn)!;
    const state = freshState();
    state.px = spawn.x * scene.tileSize + scene.tileSize / 2;
    state.py = spawn.y * scene.tileSize + scene.tileSize / 2;

    expect(Math.floor(state.px / scene.tileSize)).toBe(spawn.x);
    expect(Math.floor(state.py / scene.tileSize)).toBe(spawn.y);
  });

  it('player can walk to the hermit NPC position', () => {
    const scene = scenes.get(cliffsideId)!;
    const spawn = (scene.entities ?? []).find(isSpawn)!;
    const hermit = (scene.entities ?? []).find(isNpc)!;

    const state = freshState();
    state.sceneId = cliffsideId;
    state.px = spawn.x * scene.tileSize + scene.tileSize / 2;
    state.py = spawn.y * scene.tileSize + scene.tileSize / 2;

    simulatePlayerMovement(scene, state, hermit.x, hermit.y);

    const playerTileX = Math.floor(state.px / scene.tileSize);
    const playerTileY = Math.floor(state.py / scene.tileSize);
    // Should be at or adjacent to the hermit
    expect(Math.abs(playerTileX - hermit.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(playerTileY - hermit.y)).toBeLessThanOrEqual(1);
  });

  it('interacting with the hermit flag-action sets metHermit flag', () => {
    const scene = scenes.get(cliffsideId)!;
    const flagAction = (scene.entities ?? []).filter(isAction).find(
      (a) => a.properties?.action?.steps.some(
        (s) => s.type === 'changePlayerState' && s.params.flag === 'metHermit',
      ),
    )!;

    const state = freshState();
    const action = flagAction.properties!.action!;
    if (action.oneShot) state.firedActions.add(flagAction.id);
    const ctx: StepHandlerContext = {
      state,
      requestSceneChange: () => {},
    };
    // Simulate: remove from firedActions to let it fire
    state.firedActions.delete(flagAction.id);
    runActionSteps(action.steps, ctx);

    expect(state.flags.metHermit).toBe(true);
  });

  it('walking to the exit zone triggers scene change to Lighthouse Top', () => {
    const scene = scenes.get(cliffsideId)!;
    const spawn = (scene.entities ?? []).find(isSpawn)!;
    const exit = (scene.entities ?? []).find(isExit)!;

    const state = freshState();
    state.sceneId = cliffsideId;
    state.px = spawn.x * scene.tileSize + scene.tileSize / 2;
    state.py = spawn.y * scene.tileSize + scene.tileSize / 2;

    const { sceneChanges } = simulatePlayerMovement(scene, state, exit.x, exit.y);

    expect(sceneChanges.length).toBeGreaterThan(0);
    expect(sceneChanges[0].sceneId).toBe(topId);
  });

  it('stepping near the light in Lighthouse Top triggers endAdventure', () => {
    const scene = scenes.get(topId)!;
    const endingAction = (scene.entities ?? []).filter(isAction).find(
      (a) => a.properties?.action?.steps.some((s) => s.type === 'endAdventure'),
    )!;

    const state = freshState();
    state.sceneId = topId;
    // Start at the bottom (where exit puts the player)
    state.px = 5 * scene.tileSize + scene.tileSize / 2;
    state.py = 6 * scene.tileSize + scene.tileSize / 2;

    simulatePlayerMovement(scene, state, endingAction.x, endingAction.y);

    expect(state.ended).toBe(true);
    expect(state.endMessage).toBeTruthy();
  });

  it('collision prevents walking into water in Cliffside', () => {
    const scene = scenes.get(cliffsideId)!;
    const state = freshState();
    state.px = 2 * scene.tileSize + scene.tileSize / 2;
    state.py = 4 * scene.tileSize + scene.tileSize / 2;

    // Try to walk left into water (columns 0-1 are water + blocked)
    simulatePlayerMovement(scene, state, 0, 4);

    const playerTileX = Math.floor(state.px / scene.tileSize);
    // Should not have entered the water
    expect(playerTileX).toBeGreaterThanOrEqual(2);
  });

  it('collision prevents walking into walls in Lighthouse Top', () => {
    const scene = scenes.get(topId)!;
    const state = freshState();
    state.px = 5 * scene.tileSize + scene.tileSize / 2;
    state.py = 5 * scene.tileSize + scene.tileSize / 2;

    // Try to walk into the left wall (x=0 is a wall)
    simulatePlayerMovement(scene, state, 0, 5);

    const playerTileX = Math.floor(state.px / scene.tileSize);
    expect(playerTileX).toBeGreaterThanOrEqual(1);
  });

  it('oneShot action fires only once even after re-entering area', () => {
    const scene = scenes.get(topId)!;
    const state = freshState();
    state.sceneId = topId;
    state.px = 5 * scene.tileSize + scene.tileSize / 2;
    state.py = 6 * scene.tileSize + scene.tileSize / 2;

    // Walk to the ending tile — should fire endAdventure
    simulatePlayerMovement(scene, state, 4, 3);
    expect(state.ended).toBe(true);

    // Reset ended (simulate restart scenario where firedActions persists)
    state.ended = false;
    state.endMessage = null;
    state.px = 5 * scene.tileSize + scene.tileSize / 2;
    state.py = 6 * scene.tileSize + scene.tileSize / 2;

    // Walk to the same tile again — should NOT fire (oneShot already consumed)
    simulatePlayerMovement(scene, state, 4, 3);
    expect(state.ended).toBe(false);
  });

  it('animation state resolves correctly for walk and idle', async () => {
    const { generateLighthouseBundle } = await import('../src/lib/sampleCollections/lighthouse.js');
    const bundle = generateLighthouseBundle();
    const sheetEntry = Object.values(bundle.spriteSheets)[0];
    // Build a minimal LoadedSpriteSheet without Image (which needs DOM)
    const stateMap = new Map(sheetEntry.def.states.map((s) => [s.name, s]));
    const sheet = { def: sheetEntry.def, image: {} as HTMLImageElement, stateMap };

    expect(resolveActorState(sheet, 'down', true)).toBe('walk-down');
    expect(resolveActorState(sheet, 'up', false)).toBe('idle-up');
    expect(resolveActorState(sheet, 'left', true)).toBe('walk-left');
    expect(resolveActorState(sheet, 'right', false)).toBe('idle-right');
  });
});
