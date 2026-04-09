import { useEffect, useRef, useCallback } from 'react';
import { GameLoop, InputManager, loadTilemap } from '@storyengine/engine';
import type { SceneJSON, EntityDef, DialogueLine, ActionDef } from '@storyengine/shared';
import { decodeTransform } from '../lib/transformUtils.js';

export interface MediaOverlay {
  type: 'video' | 'audio' | 'image' | 'slideshow' | 'playerInput';
  url?: string;
  urls?: string[];
  loop?: boolean;
  duration?: number;
  interval?: number;
  prompt?: string;
  options?: string[];
  startedAt: number;
}

export interface PlaytestState {
  /** Player position in pixels */
  px: number;
  py: number;
  /** Player facing */
  facing: 'down' | 'up' | 'left' | 'right';
  /** Current scene ID */
  sceneId: string;
  /** Active dialogue lines to display */
  dialogue: DialogueLine[] | null;
  /** Current dialogue line index */
  dialogueIndex: number;
  /** Whether playtest is running */
  running: boolean;
  /** Set of one-shot action IDs that have fired */
  firedActions: Set<string>;
  /** Player state flags (from changePlayerState actions) */
  flags: Record<string, unknown>;
  /** Active media overlay (video, image, slideshow, etc.) */
  media: MediaOverlay | null;
  /** Active audio (plays in background, doesn't block movement) */
  audio: { url: string; loop: boolean } | null;
  /** Last playerInput choice */
  lastChoice: string | null;
}

interface PlaytestConfig {
  collection: {
    scenes: { id: string; name: string; scene: SceneJSON }[];
  };
  tileImages: ImageBitmap[];
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
  });
  const tilemapRef = useRef<Tilemap | null>(null);
  const sceneRef = useRef<SceneJSON | null>(null);
  const loopRef = useRef<GameLoop | null>(null);
  const inputRef = useRef<InputManager | null>(null);

  const { collection, tileImages, canvasRef, onStateChange, scale = 3 } = config;

  const notify = useCallback(() => {
    onStateChange({ ...stateRef.current });
  }, [onStateChange]);

  const loadScene = useCallback((sceneId: string, spawnX?: number, spawnY?: number) => {
    const entry = collection.scenes.find((s) => s.id === sceneId);
    if (!entry) return;
    const scene = entry.scene;
    const tilemap = loadTilemap(scene);
    tilemapRef.current = tilemap;
    sceneRef.current = scene;

    // Find spawn point
    const spawn = scene.entities?.find((e) => e.type === 'spawn');
    const sx = spawnX ?? spawn?.x ?? 0;
    const sy = spawnY ?? spawn?.y ?? 0;

    stateRef.current.sceneId = sceneId;
    stateRef.current.px = sx * scene.tileSize + scene.tileSize / 2;
    stateRef.current.py = sy * scene.tileSize + scene.tileSize / 2;
    stateRef.current.dialogue = null;
    stateRef.current.dialogueIndex = 0;
    stateRef.current.media = null;

    // Fire auto-trigger actions
    const entities = scene.entities ?? [];
    for (const ent of entities) {
      if (ent.type !== 'action') continue;
      const action = ent.properties?.action as ActionDef | undefined;
      if (!action || action.trigger !== 'auto') continue;
      if (action.oneShot && stateRef.current.firedActions.has(ent.id)) continue;
      executeAction(ent, action);
    }

    notify();
  }, [collection, notify]);

  const executeAction = useCallback((entity: EntityDef, action: ActionDef) => {
    if (action.oneShot) {
      stateRef.current.firedActions.add(entity.id);
    }

    // Process steps sequentially — blocking overlays pause further steps
    for (const step of action.steps) {
      switch (step.type) {
        case 'showDialogue': {
          const lines = step.params.lines as DialogueLine[] | undefined;
          if (lines && lines.length > 0) {
            stateRef.current.dialogue = lines;
            stateRef.current.dialogueIndex = 0;
          }
          break;
        }
        case 'changeScene': {
          const targetSceneId = step.params.targetSceneId as string;
          const sx = (step.params.spawnX as number) ?? 0;
          const sy = (step.params.spawnY as number) ?? 0;
          if (targetSceneId) {
            // Defer to next microtask — avoids mutating scene state mid-iteration
            setTimeout(() => loadScene(targetSceneId, sx, sy), 0);
          }
          return; // Stop processing further steps after scene change
        }
        case 'changePlayerState': {
          const flag = step.params.flag as string;
          const value = step.params.value;
          if (flag) stateRef.current.flags[flag] = value;
          break;
        }
        case 'playVideo': {
          stateRef.current.media = {
            type: 'video',
            url: step.params.url as string,
            startedAt: Date.now(),
          };
          break;
        }
        case 'playAudio': {
          stateRef.current.audio = {
            url: step.params.url as string,
            loop: (step.params.loop as boolean) ?? false,
          };
          break;
        }
        case 'stopAudio': {
          stateRef.current.audio = null;
          break;
        }
        case 'showImage': {
          stateRef.current.media = {
            type: 'image',
            url: step.params.url as string,
            duration: (step.params.duration as number) ?? 3000,
            startedAt: Date.now(),
          };
          break;
        }
        case 'showSlideshow': {
          stateRef.current.media = {
            type: 'slideshow',
            urls: (step.params.images as string[]) ?? [],
            interval: (step.params.interval as number) ?? 2000,
            startedAt: Date.now(),
          };
          break;
        }
        case 'playerInput': {
          stateRef.current.media = {
            type: 'playerInput',
            prompt: (step.params.prompt as string) ?? 'What do you do?',
            options: (step.params.options as string[]) ?? [],
            startedAt: Date.now(),
          };
          break;
        }
        case 'playGroupAnimation': {
          // Group animations play automatically via tilemap — no runtime action needed
          break;
        }
        case 'playActorAnimation': {
          // Stub — would animate an NPC/actor sprite
          break;
        }
      }
    }
    notify();
  }, [loadScene, notify]);

  const findNearbyEntity = useCallback((type: string, maxRadius?: number): EntityDef | null => {
    const scene = sceneRef.current;
    if (!scene) return null;
    const ts = scene.tileSize;
    const playerTileX = Math.floor(stateRef.current.px / ts);
    const playerTileY = Math.floor(stateRef.current.py / ts);

    let best: EntityDef | null = null;
    let bestDist = Infinity;
    for (const ent of scene.entities ?? []) {
      if (ent.type !== type) continue;
      // Per-entity radius: action entities use their ActionDef radius, others use 0 (same tile)
      let radius = 0;
      if (ent.type === 'action') {
        const action = ent.properties?.action as ActionDef | undefined;
        radius = action?.radius ?? 0;
      } else if (ent.type === 'npc') {
        radius = 1; // NPCs: interact when adjacent
      }
      if (maxRadius !== undefined) radius = Math.min(radius, maxRadius);
      const dx = Math.abs(ent.x - playerTileX);
      const dy = Math.abs(ent.y - playerTileY);
      const dist = Math.max(dx, dy); // Chebyshev distance
      if (dist <= radius && dist < bestDist) {
        best = ent;
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
      const dialogue = npc.properties?.dialogue as DialogueLine[] | undefined;
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
      const action = actionEntity.properties?.action as ActionDef | undefined;
      if (!action || action.trigger !== 'interact') return;
      if (action.oneShot && stateRef.current.firedActions.has(actionEntity.id)) return;
      executeAction(actionEntity, action);
    }
  }, [findNearbyEntity, executeAction, dismissOverlay, notify]);

  // Start playtest
  const start = useCallback(() => {
    if (collection.scenes.length === 0) return;

    inputRef.current = new InputManager(window);
    stateRef.current.running = true;
    stateRef.current.firedActions = new Set();
    stateRef.current.flags = {};

    loadScene(collection.scenes[0].id);

    const loop = new GameLoop({
      update(dt: number) {
        const s = stateRef.current;
        const tilemap = tilemapRef.current;
        const scene = sceneRef.current;
        const input = inputRef.current;
        if (!tilemap || !scene || !input) return;

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

        // Check step-trigger actions
        const playerTileX = Math.floor(s.px / ts);
        const playerTileY = Math.floor(s.py / ts);
        for (const ent of scene.entities ?? []) {
          if (ent.type !== 'action') continue;
          const action = ent.properties?.action as ActionDef | undefined;
          if (!action || action.trigger !== 'step') continue;
          if (ent.x === playerTileX && ent.y === playerTileY) {
            if (action.oneShot && s.firedActions.has(ent.id)) continue;
            executeAction(ent, action);
          }
        }

        // Check exit zones
        for (const ent of scene.entities ?? []) {
          if (ent.type !== 'exit') continue;
          const ew = ent.width ?? 1;
          const eh = ent.height ?? 1;
          if (playerTileX >= ent.x && playerTileX < ent.x + ew &&
              playerTileY >= ent.y && playerTileY < ent.y + eh) {
            const targetId = ent.properties?.targetSceneId as string | undefined;
            if (targetId) {
              const spawnX = (ent.properties?.spawnX as number) ?? undefined;
              const spawnY = (ent.properties?.spawnY as number) ?? undefined;
              loadScene(targetId, spawnX, spawnY);
              break;
            }
          }
        }

        // Update tile animations
        tilemap.updateAnimations(dt);

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
        const renderW = scene.width * ts;
        const renderH = scene.height * ts;

        canvas.width = renderW * scale;
        canvas.height = renderH * scale;
        ctx.imageSmoothingEnabled = false;

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

        // Draw NPC markers (small yellow dots)
        for (const ent of scene.entities ?? []) {
          if (ent.type !== 'npc') continue;
          const ex = (ent.x * ts + ts / 2) * scale;
          const ey = (ent.y * ts + ts / 2) * scale;
          ctx.fillStyle = '#f9e2af';
          ctx.beginPath();
          ctx.arc(ex, ey, 4 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#1e1e2e';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw player — tile-sized character with strong visibility
        const playerPx = s.px * scale;
        const playerPy = s.py * scale;
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
  }, [collection, tileImages, canvasRef, scale, loadScene, handleInteract, executeAction, notify]);

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
