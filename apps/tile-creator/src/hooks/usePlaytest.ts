import { useEffect, useRef, useCallback } from 'react';
import { GameLoop, InputManager, loadTilemap } from '@storyengine/engine';
import type { SceneJSON, EntityDef, ActionDef, SpriteSheetDef, ActionEntity } from '@storyengine/shared';
import { isSpawn, isExit, isNpc, isAction } from '@storyengine/shared';
import { decodeTransform } from '../lib/transformUtils.js';
import type { PlaytestState, MediaOverlay } from './playtest/types.js';
import type { LoadedSpriteSheet, ActorAnim } from './playtest/actorAnimations.js';
import { loadSpriteSheet, resolveActorState, advanceActorAnim } from './playtest/actorAnimations.js';
import { runActionSteps, canTriggerAction, type StepHandlerContext } from './playtest/actionHandlers.js';

// Re-export types for consumers
export type { PlaytestState, MediaOverlay };

interface PlaytestConfig {
  collection: {
    scenes: { id: string; name: string; scene: SceneJSON }[];
  };
  tileImages: ImageBitmap[];
  /** Sprite sheets available to resolve entity spriteSheetId references. */
  spriteSheets: { id: string; def: SpriteSheetDef; dataUrl: string }[];
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onStateChange: (state: PlaytestState) => void;
  scale?: number;
}

const PLAYER_SPEED = 80; // pixels per second

export function usePlaytest(config: PlaytestConfig) {
  const stateRef = useRef<PlaytestState>({
    px: 0, py: 0, facing: 'down',
    sceneId: '', dialogue: null, dialogueIndex: 0,
    running: false, firedActions: new Set(), flags: {},
    media: null, audio: null, lastChoice: null,
    ended: false, endMessage: null,
  });
  const tilemapRef = useRef<Tilemap | null>(null);
  const sceneRef = useRef<SceneJSON | null>(null);
  const loopRef = useRef<GameLoop | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  /** Cache of loaded sprite sheets by id. Populated at start(). */
  const spriteSheetsRef = useRef<Map<string, LoadedSpriteSheet>>(new Map());
  /** Per-entity animation state, keyed by entity ID ('player' for the player). */
  const actorAnimsRef = useRef<Map<string, ActorAnim>>(new Map());
  /** Pre-bucketed entity refs — populated once per loadScene, avoid per-frame scans. */
  const spawnRef = useRef<import('@storyengine/shared').SpawnEntity | null>(null);
  const exitsRef = useRef<import('@storyengine/shared').ExitEntity[]>([]);
  const npcsRef = useRef<import('@storyengine/shared').NpcEntity[]>([]);
  const stepActionsRef = useRef<import('@storyengine/shared').ActionEntity[]>([]);
  const autoActionsRef = useRef<import('@storyengine/shared').ActionEntity[]>([]);
  /** Deferred scene change from executeAction — applied at top of next update. */
  const pendingSceneChangeRef = useRef<{ sceneId: string; sx?: number; sy?: number } | null>(null);

  const { collection, tileImages, spriteSheets, canvasRef, onStateChange, scale = 3 } = config;

  const notify = useCallback(() => {
    onStateChange({ ...stateRef.current });
  }, [onStateChange]);

  /**
   * Map-backed wrapper around the pure `advanceActorAnim` helper.
   * Keeps the per-entity Map lookup out of the pure module.
   */
  const tickActorAnim = useCallback((
    entityId: string,
    sheet: LoadedSpriteSheet,
    desiredState: string,
    dt: number,
  ): ActorAnim => {
    const current = actorAnimsRef.current.get(entityId);
    const next = advanceActorAnim(current, sheet, desiredState, dt);
    actorAnimsRef.current.set(entityId, next);
    return next;
  }, []);

  const loadScene = useCallback((sceneId: string, spawnX?: number, spawnY?: number) => {
    const entry = collection.scenes.find((s) => s.id === sceneId);
    if (!entry) return;
    const scene = entry.scene;
    const tilemap = loadTilemap(scene);
    tilemapRef.current = tilemap;
    sceneRef.current = scene;

    // Pre-bucket entities once — avoids per-frame linear scans.
    const entities = scene.entities ?? [];
    const spawn = entities.find(isSpawn) ?? null;
    spawnRef.current = spawn;
    exitsRef.current = entities.filter(isExit);
    npcsRef.current = entities.filter(isNpc);
    const actions = entities.filter(isAction);
    stepActionsRef.current = actions.filter((a) => a.properties?.action?.trigger === 'step');
    autoActionsRef.current = actions.filter((a) => a.properties?.action?.trigger === 'auto');

    // Position player at spawn
    const sx = spawnX ?? spawn?.x ?? 0;
    const sy = spawnY ?? spawn?.y ?? 0;
    stateRef.current.sceneId = sceneId;
    stateRef.current.px = sx * scene.tileSize + scene.tileSize / 2;
    stateRef.current.py = sy * scene.tileSize + scene.tileSize / 2;
    stateRef.current.dialogue = null;
    stateRef.current.dialogueIndex = 0;
    stateRef.current.media = null;

    // Fire auto-trigger actions
    for (const ent of autoActionsRef.current) {
      const action = ent.properties?.action;
      if (!action) continue;
      if (action.oneShot && stateRef.current.firedActions.has(ent.id)) continue;
      if (!canTriggerAction(action, stateRef.current)) continue;
      executeAction(ent, action);
    }

    notify();
  }, [collection, notify]);

  const executeAction = useCallback((entity: ActionEntity, action: ActionDef) => {
    if (action.oneShot) stateRef.current.firedActions.add(entity.id);
    const ctx: StepHandlerContext = {
      state: stateRef.current,
      requestSceneChange: (sceneId, sx, sy) => {
        pendingSceneChangeRef.current = { sceneId, sx, sy };
      },
      setActorAnimation: (entityId, stateName) => {
        const npc = npcsRef.current.find((n) => n.id === entityId);
        const sheetId = npc?.properties?.spriteSheetId;
        if (!sheetId) return;
        const sheet = spriteSheetsRef.current.get(sheetId);
        if (!sheet) return;
        const stateDef = sheet.stateMap.get(stateName);
        if (stateDef) {
          // Force the actor into this state (non-looping = one-shot).
          actorAnimsRef.current.set(entityId, {
            stateName,
            frame: 0,
            accumMs: 0,
          });
        }
      },
    };
    runActionSteps(action.steps, ctx);
    notify();
  }, [loadScene, notify]);

  const findNearbyEntity = useCallback(<T extends EntityDef['type']>(
    type: T,
    maxRadius?: number,
  ): Extract<EntityDef, { type: T }> | null => {
    const scene = sceneRef.current;
    if (!scene) return null;
    const ts = scene.tileSize;
    const playerTileX = Math.floor(stateRef.current.px / ts);
    const playerTileY = Math.floor(stateRef.current.py / ts);

    let best: Extract<EntityDef, { type: T }> | null = null;
    let bestDist = Infinity;
    for (const ent of scene.entities ?? []) {
      if (ent.type !== type) continue;
      // Per-entity radius: action entities use their ActionDef radius, others use 0 (same tile)
      let radius = 0;
      if (ent.type === 'action') {
        const action = ent.properties?.action;
        radius = action?.radius ?? 0;
      } else if (ent.type === 'npc') {
        radius = 1; // NPCs: interact when adjacent
      }
      if (maxRadius !== undefined) radius = Math.min(radius, maxRadius);
      const dx = Math.abs(ent.x - playerTileX);
      const dy = Math.abs(ent.y - playerTileY);
      const dist = Math.max(dx, dy); // Chebyshev distance
      if (dist <= radius && dist < bestDist) {
        // Cast is safe: we checked `ent.type !== type` above and continue if so.
        best = ent as Extract<EntityDef, { type: T }>;
        bestDist = dist;
      }
    }
    return best;
  }, []);

  const dismissOverlay = useCallback(() => {
    stateRef.current.media = null;
    notify();
  }, [notify]);

  const handleInteract = useCallback(() => {
    // If media overlay is active, dismiss it
    if (stateRef.current.media) {
      dismissOverlay();
      return;
    }

    // If dialogue is active, advance it
    if (stateRef.current.dialogue) {
      stateRef.current.dialogueIndex++;
      if (stateRef.current.dialogueIndex >= stateRef.current.dialogue.length) {
        stateRef.current.dialogue = null;
        stateRef.current.dialogueIndex = 0;
      }
      notify();
      return;
    }

    // Try NPC interaction
    const npc = findNearbyEntity('npc');
    if (npc) {
      const dialogue = npc.properties?.dialogue;
      if (dialogue && dialogue.length > 0) {
        stateRef.current.dialogue = dialogue;
        stateRef.current.dialogueIndex = 0;
        notify();
        return;
      }
    }

    // Try action tile interaction
    const actionEntity = findNearbyEntity('action');
    if (actionEntity) {
      const action = actionEntity.properties?.action;
      if (!action || action.trigger !== 'interact') return;
      if (action.oneShot && stateRef.current.firedActions.has(actionEntity.id)) return;
      if (!canTriggerAction(action, stateRef.current)) return;
      executeAction(actionEntity, action);
    }
  }, [findNearbyEntity, executeAction, dismissOverlay, notify]);

  // Start playtest
  const start = useCallback(() => {
    if (collection.scenes.length === 0) return;

    // Guard: stop any existing loop to prevent leaking a dangling rAF cycle.
    if (loopRef.current) loopRef.current.stop();
    inputRef.current?.destroy();

    inputRef.current = new InputManager(window);
    stateRef.current.running = true;
    stateRef.current.firedActions = new Set();
    stateRef.current.flags = {};
    stateRef.current.ended = false;
    stateRef.current.endMessage = null;
    actorAnimsRef.current.clear();

    // Preload sprite sheets into the cache (async, but we start the loop anyway
    // since rendering gracefully falls back to the placeholder while loading).
    spriteSheetsRef.current.clear();
    for (const sheet of spriteSheets) {
      spriteSheetsRef.current.set(sheet.id, loadSpriteSheet(sheet.def, sheet.dataUrl));
    }

    loadScene(collection.scenes[0].id);

    const loop = new GameLoop({
      update(dt: number) {
        const s = stateRef.current;
        const tilemap = tilemapRef.current;
        const scene = sceneRef.current;
        const input = inputRef.current;
        if (!tilemap || !scene || !input) return;

        // Apply deferred scene change from the previous tick's executeAction.
        const pending = pendingSceneChangeRef.current;
        if (pending) {
          pendingSceneChangeRef.current = null;
          loadScene(pending.sceneId, pending.sx, pending.sy);
          input.endFrame();
          return;
        }

        // Adventure is over — no input processing until restart
        if (s.ended) { input.endFrame(); return; }

        // Don't move while dialogue or media overlay is active
        if (s.dialogue || s.media) {
          if (input.isJustPressed('Space') || input.isJustPressed('Enter') || input.isJustPressed('KeyE')) {
            handleInteract();
          }
          // playerInput: number keys select options
          if (s.media?.type === 'playerInput' && s.media.options) {
            for (let i = 0; i < s.media.options.length; i++) {
              if (input.isJustPressed(`Digit${i + 1}`)) {
                s.lastChoice = s.media.options[i];
                s.flags[`lastChoice`] = s.media.options[i];
                s.media = null;
                notify();
                break;
              }
            }
          }
          input.endFrame();
          return;
        }

        // Interact key
        if (input.isJustPressed('Space') || input.isJustPressed('Enter') || input.isJustPressed('KeyE')) {
          handleInteract();
        }

        // Movement
        const move = input.getMovement();
        const ts = scene.tileSize;

        if (move.x !== 0 || move.y !== 0) {
          const dtSec = dt / 1000;
          const newPx = s.px + move.x * PLAYER_SPEED * dtSec;
          const newPy = s.py + move.y * PLAYER_SPEED * dtSec;

          // Collision check — check each axis separately for sliding
          const halfTs = ts / 2;

          // Check X axis
          const testTileX = Math.floor(newPx / ts);
          const testTileYCur = Math.floor(s.py / ts);
          if (tilemap.isWalkable(testTileX, testTileYCur)) {
            s.px = Math.max(halfTs, Math.min(tilemap.pixelWidth - halfTs, newPx));
          }

          // Check Y axis
          const testTileXCur = Math.floor(s.px / ts);
          const testTileY = Math.floor(newPy / ts);
          if (tilemap.isWalkable(testTileXCur, testTileY)) {
            s.py = Math.max(halfTs, Math.min(tilemap.pixelHeight - halfTs, newPy));
          }

          // Update facing
          if (Math.abs(move.x) > Math.abs(move.y)) {
            s.facing = move.x > 0 ? 'right' : 'left';
          } else {
            s.facing = move.y > 0 ? 'down' : 'up';
          }
        }

        // Check step-trigger actions (pre-bucketed at loadScene)
        const playerTileX = Math.floor(s.px / ts);
        const playerTileY = Math.floor(s.py / ts);
        for (const ent of stepActionsRef.current) {
          const action = ent.properties?.action;
          if (!action) continue;
          if (ent.x === playerTileX && ent.y === playerTileY) {
            if (action.oneShot && s.firedActions.has(ent.id)) continue;
            if (!canTriggerAction(action, s)) continue;
            executeAction(ent, action);
          }
        }

        // Check exit zones (pre-bucketed at loadScene)
        for (const exit of exitsRef.current) {
          const ew = exit.width ?? 1;
          const eh = exit.height ?? 1;
          if (playerTileX >= exit.x && playerTileX < exit.x + ew &&
              playerTileY >= exit.y && playerTileY < exit.y + eh) {
            const targetId = exit.properties?.targetSceneId;
            if (targetId) {
              loadScene(targetId, exit.properties?.spawnX, exit.properties?.spawnY);
              break;
            }
          }
        }

        // Update tile animations (skip if scene has none)
        if (tilemap.hasAnimations) tilemap.updateAnimations(dt);

        // Update sprite animations — player (cached spawn ref)
        const playerSheetId = spawnRef.current?.properties?.spriteSheetId;
        if (playerSheetId) {
          const sheet = spriteSheetsRef.current.get(playerSheetId);
          if (sheet) {
            const playerIsMoving = move.x !== 0 || move.y !== 0;
            const stateName = resolveActorState(sheet, s.facing, playerIsMoving);
            tickActorAnim('player', sheet, stateName, dt);
          }
        }
        // NPCs (pre-bucketed at loadScene)
        for (const npc of npcsRef.current) {
          const npcSheetId = npc.properties?.spriteSheetId;
          if (!npcSheetId) continue;
          const sheet = spriteSheetsRef.current.get(npcSheetId);
          if (!sheet) continue;
          const stateName = sheet.stateMap.has('idle-down')
            ? 'idle-down'
            : sheet.def.defaultState;
          tickActorAnim(npc.id, sheet, stateName, dt);
        }

        input.endFrame();
      },

      render(_interpolation: number) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const s = stateRef.current;
        const tilemap = tilemapRef.current;
        const scene = sceneRef.current;
        if (!tilemap || !scene) return;

        const ts = scene.tileSize;
        const wantW = scene.width * ts * scale;
        const wantH = scene.height * ts * scale;

        if (canvas.width !== wantW || canvas.height !== wantH) {
          canvas.width = wantW;
          canvas.height = wantH;
          ctx.imageSmoothingEnabled = false;
        }

        ctx.fillStyle = '#0e0e1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw tile layers
        for (let li = 0; li < scene.layers.length; li++) {
          const layer = scene.layers[li];
          for (let y = 0; y < scene.height; y++) {
            for (let x = 0; x < scene.width; x++) {
              const idx = y * scene.width + x;
              const rawTileId = layer.data[idx];
              if (rawTileId < 0) continue;

              const tileId = tilemap.resolveAnimatedTile(rawTileId, x, y, li);
              if (tileId < 0 || tileId >= tileImages.length) continue;

              const px = x * ts * scale;
              const py = y * ts * scale;
              const sz = ts * scale;

              const rawT = layer.transforms?.[idx] ?? 0;
              const { rotation, flipH, flipV } = decodeTransform(rawT);

              if (rotation === 0 && !flipH && !flipV) {
                ctx.drawImage(tileImages[tileId], px, py, sz, sz);
              } else {
                ctx.save();
                ctx.translate(px + sz / 2, py + sz / 2);
                ctx.rotate((rotation * Math.PI) / 2);
                ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
                ctx.drawImage(tileImages[tileId], -sz / 2, -sz / 2, sz, sz);
                ctx.restore();
              }
            }
          }
        }

        // Draw NPCs — sprite if assigned, else yellow dot placeholder
        for (const ent of npcsRef.current) {
          const npcSheetId = ent.properties?.spriteSheetId;
          const npcSheet = npcSheetId ? spriteSheetsRef.current.get(npcSheetId) : undefined;
          const ex = (ent.x * ts + ts / 2) * scale;
          const ey = (ent.y * ts + ts / 2) * scale;

          if (npcSheet && npcSheet.image.complete && npcSheet.image.naturalWidth > 0) {
            // NPCs default to idle-down unless a defaultState suggests otherwise
            const stateName = npcSheet.stateMap.has('idle-down')
              ? 'idle-down'
              : npcSheet.def.defaultState;
            const anim = actorAnimsRef.current.get(ent.id);
            const frame = anim?.frame ?? 0;
            const state = npcSheet.stateMap.get(stateName);
            if (state) {
              const sx = (state.colStart + frame) * npcSheet.def.frameWidth;
              const sy = state.row * npcSheet.def.frameHeight;
              const drawW = npcSheet.def.frameWidth * scale;
              const drawH = npcSheet.def.frameHeight * scale;
              // Anchor: feet at the tile center bottom
              const dx = ex - drawW / 2;
              const dy = (ent.y * ts + ts) * scale - drawH;
              ctx.drawImage(
                npcSheet.image,
                sx, sy, npcSheet.def.frameWidth, npcSheet.def.frameHeight,
                dx, dy, drawW, drawH,
              );
            }
          } else {
            // Placeholder: yellow dot
            ctx.fillStyle = '#f9e2af';
            ctx.beginPath();
            ctx.arc(ex, ey, 4 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1e1e2e';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Draw player — sprite if assigned, else green-square placeholder
        const playerPx = s.px * scale;
        const playerPy = s.py * scale;
        const playerSheetId = spawnRef.current?.properties?.spriteSheetId;
        const playerSheet = playerSheetId
          ? spriteSheetsRef.current.get(playerSheetId)
          : undefined;

        if (playerSheet && playerSheet.image.complete && playerSheet.image.naturalWidth > 0) {
          const anim = actorAnimsRef.current.get('player');
          const stateName = anim?.stateName ?? playerSheet.def.defaultState;
          const state = playerSheet.stateMap.get(stateName);
          if (state) {
            const frame = anim?.frame ?? 0;
            const sx = (state.colStart + frame) * playerSheet.def.frameWidth;
            const sy = state.row * playerSheet.def.frameHeight;
            const drawW = playerSheet.def.frameWidth * scale;
            const drawH = playerSheet.def.frameHeight * scale;
            // Anchor: feet at the tile center bottom
            const dx = playerPx - drawW / 2;
            const dy = (s.py + ts / 2) * scale - drawH;
            ctx.drawImage(
              playerSheet.image,
              sx, sy, playerSheet.def.frameWidth, playerSheet.def.frameHeight,
              dx, dy, drawW, drawH,
            );
          }
          return; // done rendering player
        }

        // Placeholder path — tile-sized character with strong visibility
        const pSize = ts * scale; // Full tile size
        const pHalf = pSize / 2;

        // Drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(playerPx, playerPy + pHalf - 2 * scale, pHalf * 0.7, pHalf * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        const bodyX = playerPx - pHalf * 0.7;
        const bodyY = playerPy - pHalf * 0.8;
        const bodyW = pSize * 0.7;
        const bodyH = pSize * 0.9;
        ctx.fillStyle = '#a6e3a1';
        ctx.beginPath();
        ctx.roundRect(bodyX, bodyY, bodyW, bodyH, 3 * scale);
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#1e1e2e';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.roundRect(bodyX, bodyY, bodyW, bodyH, 3 * scale);
        ctx.stroke();

        // Facing indicator (eyes)
        ctx.fillStyle = '#1e1e2e';
        const eyeSize = 2 * scale;
        const eyeY = bodyY + bodyH * 0.3;
        if (s.facing === 'down' || s.facing === 'up') {
          ctx.fillRect(playerPx - eyeSize * 2, eyeY, eyeSize, eyeSize);
          ctx.fillRect(playerPx + eyeSize, eyeY, eyeSize, eyeSize);
        } else if (s.facing === 'left') {
          ctx.fillRect(bodyX + eyeSize, eyeY, eyeSize, eyeSize);
          ctx.fillRect(bodyX + eyeSize, eyeY + eyeSize * 2, eyeSize * 3, eyeSize * 0.5);
        } else {
          ctx.fillRect(bodyX + bodyW - eyeSize * 2, eyeY, eyeSize, eyeSize);
          ctx.fillRect(bodyX + bodyW - eyeSize * 4, eyeY + eyeSize * 2, eyeSize * 3, eyeSize * 0.5);
        }

        // Direction arrow above player
        ctx.fillStyle = 'rgba(166, 227, 161, 0.9)';
        const arrowY = bodyY - 4 * scale;
        ctx.beginPath();
        if (s.facing === 'down') {
          ctx.moveTo(playerPx, arrowY + 3 * scale);
          ctx.lineTo(playerPx - 3 * scale, arrowY);
          ctx.lineTo(playerPx + 3 * scale, arrowY);
        } else if (s.facing === 'up') {
          ctx.moveTo(playerPx, arrowY);
          ctx.lineTo(playerPx - 3 * scale, arrowY + 3 * scale);
          ctx.lineTo(playerPx + 3 * scale, arrowY + 3 * scale);
        } else if (s.facing === 'left') {
          ctx.moveTo(playerPx - 3 * scale, arrowY + 1.5 * scale);
          ctx.lineTo(playerPx, arrowY);
          ctx.lineTo(playerPx, arrowY + 3 * scale);
        } else {
          ctx.moveTo(playerPx + 3 * scale, arrowY + 1.5 * scale);
          ctx.lineTo(playerPx, arrowY);
          ctx.lineTo(playerPx, arrowY + 3 * scale);
        }
        ctx.closePath();
        ctx.fill();
      },
    });

    loopRef.current = loop;
    loop.start();
    notify();
  }, [collection, tileImages, spriteSheets, canvasRef, scale, loadScene, handleInteract, executeAction, tickActorAnim, notify]);

  const stop = useCallback(() => {
    loopRef.current?.stop();
    loopRef.current = null;
    inputRef.current?.destroy();
    inputRef.current = null;
    stateRef.current.running = false;
    stateRef.current.dialogue = null;
    stateRef.current.media = null;
    stateRef.current.audio = null;
    notify();
  }, [notify]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      loopRef.current?.stop();
      inputRef.current?.destroy();
    };
  }, []);

  return { start, stop, stateRef };
}
