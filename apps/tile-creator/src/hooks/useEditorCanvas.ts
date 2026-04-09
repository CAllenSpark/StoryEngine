import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { decodeTransform } from '../lib/transformUtils.js';
import type { TileAnimation } from '@storyengine/shared';
import { migrateTileAnimation, resolvePhaseFrame } from '@storyengine/shared';

function resolveAnimatedTile(
  tileId: number,
  migratedAnims: Map<string, TileAnimation> | null,
  clock: number,
  tileCount: number,
): number {
  if (!migratedAnims) return tileId;
  const anim = migratedAnims.get(String(tileId));
  if (!anim) return tileId;
  const result = resolvePhaseFrame(anim.phases, clock);
  if (!result) return tileId;
  const resolved = anim.phases[result.phaseIndex]?.frames[result.frameIndex] ?? tileId;
  return resolved < tileCount ? resolved : tileId;
}

function resolveGroupFrame(
  group: import('@storyengine/shared').GroupAnimation,
  clock: number,
): import('@storyengine/shared').GroupAnimationFrame | null {
  const result = resolvePhaseFrame(group.phases, clock);
  if (!result) return null;
  return group.phases[result.phaseIndex]?.frames[result.frameIndex] ?? null;
}

const GRID_COLOR = '#45475a';
const HOVER_COLOR = 'rgba(137, 180, 250, 0.3)';
const PLACEHOLDER_COLORS = [
  '#a6e3a1', '#89b4fa', '#f9e2af', '#f38ba8', '#cba6f7',
  '#94e2d5', '#fab387', '#74c7ec', '#f2cdcd', '#b4befe',
];

export function useEditorCanvas(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const isPaintingRef = useRef(false);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingSelectionRef = useRef(false);

  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = useEditorStore.getState();
      const { scene, layerVisibility, zoom, tileset, selectionBounds, clipboard, activeTool, animClock } = state;
      // Pre-migrate animations once per render (not per-tile)
      const rawAnims = tileset?.ref.animations;
      let migratedAnims: Map<string, TileAnimation> | null = null;
      if (rawAnims) {
        migratedAnims = new Map();
        for (const [key, raw] of Object.entries(rawAnims)) {
          migratedAnims.set(key, migrateTileAnimation(raw));
        }
      }
      const ts = scene.tileSize;
      const w = scene.width * ts * zoom;
      const h = scene.height * ts * zoom;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);

      // Build group animation overlay
      const groupOverlay = new Map<number, number>();
      for (const group of scene.groupAnimations ?? []) {
        const frame = resolveGroupFrame(group, animClock);
        if (!frame) continue;
        for (let gy = 0; gy < group.height; gy++) {
          for (let gx = 0; gx < group.width; gx++) {
            const tid = frame.tiles[gy * group.width + gx];
            if (tid !== undefined && tid >= 0) {
              groupOverlay.set((group.x + gx) + (group.y + gy) * 1024 + group.layer * 1048576, tid);
            }
          }
        }
      }

      const tileCount = tileset?.tileImages.length ?? 0;

      for (let li = 0; li < scene.layers.length; li++) {
        if (!layerVisibility[li]) continue;
        const layer = scene.layers[li];
        for (let y = 0; y < scene.height; y++) {
          for (let x = 0; x < scene.width; x++) {
            const dataIdx = y * scene.width + x;
            const rawTileId = layer.data[dataIdx];
            // Check group overlay first
            const groupTile = groupOverlay.get(x + y * 1024 + li * 1048576);
            const baseTile = groupTile !== undefined ? groupTile : rawTileId;
            if (baseTile < 0) continue;
            const tileId = groupTile !== undefined
              ? groupTile
              : resolveAnimatedTile(rawTileId, migratedAnims, animClock, tileCount);
            const px = x * ts * zoom;
            const py = y * ts * zoom;
            const sz = ts * zoom;
            const rawTransform = layer.transforms?.[dataIdx] ?? 0;
            const { rotation, flipH, flipV } = decodeTransform(rawTransform);

            if (tileset && tileId < tileset.tileImages.length) {
              if (rotation === 0 && !flipH && !flipV) {
                ctx.drawImage(tileset.tileImages[tileId], px, py, sz, sz);
              } else {
                ctx.save();
                ctx.translate(px + sz / 2, py + sz / 2);
                ctx.rotate((rotation * Math.PI) / 2);
                ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
                ctx.drawImage(tileset.tileImages[tileId], -sz / 2, -sz / 2, sz, sz);
                ctx.restore();
              }
            } else {
              ctx.fillStyle = PLACEHOLDER_COLORS[tileId % PLACEHOLDER_COLORS.length];
              ctx.fillRect(px, py, sz, sz);
            }
          }
        }
      }

      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      for (let x = 0; x <= scene.width; x++) {
        const px = x * ts * zoom;
        ctx.beginPath();
        ctx.moveTo(px + 0.5, 0);
        ctx.lineTo(px + 0.5, h);
        ctx.stroke();
      }
      for (let y = 0; y <= scene.height; y++) {
        const py = y * ts * zoom;
        ctx.beginPath();
        ctx.moveTo(0, py + 0.5);
        ctx.lineTo(w, py + 0.5);
        ctx.stroke();
      }

      // Collision overlay
      if (state.showCollisionOverlay && scene.collisionLayer) {
        for (let y = 0; y < scene.height; y++) {
          for (let x = 0; x < scene.width; x++) {
            if (scene.collisionLayer[y * scene.width + x] === 1) {
              ctx.fillStyle = 'rgba(243, 139, 168, 0.35)';
              ctx.fillRect(x * ts * zoom, y * ts * zoom, ts * zoom, ts * zoom);
              // Small X marker
              ctx.strokeStyle = 'rgba(243, 139, 168, 0.6)';
              ctx.lineWidth = 1;
              const cx = x * ts * zoom + ts * zoom * 0.2;
              const cy2 = y * ts * zoom + ts * zoom * 0.2;
              const sz = ts * zoom * 0.6;
              ctx.beginPath();
              ctx.moveTo(cx, cy2); ctx.lineTo(cx + sz, cy2 + sz);
              ctx.moveTo(cx + sz, cy2); ctx.lineTo(cx, cy2 + sz);
              ctx.stroke();
            }
          }
        }
      }

      // Entity markers
      const entities = scene.entities ?? [];
      for (const ent of entities) {
        const ex = ent.x * ts * zoom;
        const ey = ent.y * ts * zoom;
        const ew = (ent.width ?? 1) * ts * zoom;
        const eh = (ent.height ?? 1) * ts * zoom;

        if (ent.type === 'spawn') {
          ctx.fillStyle = 'rgba(166, 227, 161, 0.4)';
          ctx.fillRect(ex, ey, ts * zoom, ts * zoom);
          ctx.strokeStyle = '#a6e3a1';
          ctx.lineWidth = 2;
          ctx.strokeRect(ex + 1, ey + 1, ts * zoom - 2, ts * zoom - 2);
          ctx.fillStyle = '#a6e3a1';
          ctx.font = `${Math.max(10, ts * zoom * 0.4)}px monospace`;
          ctx.fillText('S', ex + 3, ey + ts * zoom - 4);
        } else if (ent.type === 'exit') {
          ctx.fillStyle = 'rgba(137, 180, 250, 0.3)';
          ctx.fillRect(ex, ey, ew, eh);
          ctx.strokeStyle = '#89b4fa';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(ex + 1, ey + 1, ew - 2, eh - 2);
          ctx.setLineDash([]);
          ctx.fillStyle = '#89b4fa';
          ctx.font = `${Math.max(10, ts * zoom * 0.35)}px monospace`;
          ctx.fillText('EXIT', ex + 3, ey + ts * zoom - 4);
        } else if (ent.type === 'npc') {
          ctx.fillStyle = 'rgba(249, 226, 175, 0.4)';
          ctx.fillRect(ex, ey, ts * zoom, ts * zoom);
          ctx.strokeStyle = '#f9e2af';
          ctx.lineWidth = 2;
          ctx.strokeRect(ex + 1, ey + 1, ts * zoom - 2, ts * zoom - 2);
          ctx.fillStyle = '#f9e2af';
          ctx.font = `${Math.max(10, ts * zoom * 0.35)}px monospace`;
          const name = (ent.properties?.name as string) ?? 'NPC';
          ctx.fillText(name.slice(0, 3), ex + 2, ey + ts * zoom - 4);
        } else if (ent.type === 'action') {
          ctx.fillStyle = 'rgba(203, 166, 247, 0.4)';
          ctx.fillRect(ex, ey, ts * zoom, ts * zoom);
          ctx.strokeStyle = '#cba6f7';
          ctx.lineWidth = 2;
          ctx.strokeRect(ex + 1, ey + 1, ts * zoom - 2, ts * zoom - 2);
          ctx.fillStyle = '#cba6f7';
          ctx.font = `${Math.max(10, ts * zoom * 0.35)}px monospace`;
          const trigger = ((ent.properties?.action as Record<string, unknown>)?.trigger as string) ?? '?';
          ctx.fillText(trigger.slice(0, 4).toUpperCase(), ex + 2, ey + ts * zoom - 4);
        }
      }

      // Selection rectangle overlay
      if (selectionBounds) {
        const sx = selectionBounds.x1 * ts * zoom;
        const sy = selectionBounds.y1 * ts * zoom;
        const sw = (selectionBounds.x2 - selectionBounds.x1 + 1) * ts * zoom;
        const sh = (selectionBounds.y2 - selectionBounds.y1 + 1) * ts * zoom;
        ctx.strokeStyle = '#89b4fa';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.setLineDash([]);
      }

      // Clipboard ghost preview at hover position
      const hover = hoverRef.current;
      if (clipboard && activeTool === 'select' && hover && tileset) {
        ctx.globalAlpha = 0.5;
        for (let cy = 0; cy < clipboard.height; cy++) {
          for (let cx = 0; cx < clipboard.width; cx++) {
            const tileId = clipboard.tiles[cy * clipboard.width + cx];
            if (tileId < 0) continue;
            const destX = hover.x + cx;
            const destY = hover.y + cy;
            if (destX < 0 || destX >= scene.width || destY < 0 || destY >= scene.height) continue;
            const px = destX * ts * zoom;
            const py = destY * ts * zoom;
            const sz = ts * zoom;
            if (tileId < tileset.tileImages.length) {
              const rawT = clipboard.transforms[cy * clipboard.width + cx] ?? 0;
              const { rotation: rot, flipH: fH, flipV: fV } = decodeTransform(rawT);
              if (rot === 0 && !fH && !fV) {
                ctx.drawImage(tileset.tileImages[tileId], px, py, sz, sz);
              } else {
                ctx.save();
                ctx.translate(px + sz / 2, py + sz / 2);
                ctx.rotate((rot * Math.PI) / 2);
                ctx.scale(fH ? -1 : 1, fV ? -1 : 1);
                ctx.drawImage(tileset.tileImages[tileId], -sz / 2, -sz / 2, sz, sz);
                ctx.restore();
              }
            }
          }
        }
        ctx.globalAlpha = 1.0;
      }

      // Brush stamp ghost preview at hover position
      const { brushStamp } = state;
      if (brushStamp && activeTool === 'paint' && hover && tileset) {
        ctx.globalAlpha = 0.5;
        for (const bt of brushStamp.tiles) {
          const destX = hover.x + bt.dx;
          const destY = hover.y + bt.dy;
          if (destX < 0 || destX >= scene.width || destY < 0 || destY >= scene.height) continue;
          if (bt.tileId < 0 || bt.tileId >= tileset.tileImages.length) continue;
          const px = destX * ts * zoom;
          const py = destY * ts * zoom;
          const sz = ts * zoom;
          ctx.drawImage(tileset.tileImages[bt.tileId], px, py, sz, sz);
        }
        ctx.globalAlpha = 1.0;
        // Highlight the brush footprint outline
        ctx.strokeStyle = '#f9e2af';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(
          hover.x * ts * zoom,
          hover.y * ts * zoom,
          brushStamp.width * ts * zoom,
          brushStamp.height * ts * zoom,
        );
        ctx.setLineDash([]);
      }

      // Hover highlight
      if (hover && hover.x >= 0 && hover.x < scene.width && hover.y >= 0 && hover.y < scene.height) {
        ctx.fillStyle = HOVER_COLOR;
        if (brushStamp && activeTool === 'paint') {
          // Highlight all tiles in the brush footprint
          for (const bt of brushStamp.tiles) {
            const dx = hover.x + bt.dx;
            const dy = hover.y + bt.dy;
            if (dx >= 0 && dx < scene.width && dy >= 0 && dy < scene.height) {
              ctx.fillRect(dx * ts * zoom, dy * ts * zoom, ts * zoom, ts * zoom);
            }
          }
        } else {
          ctx.fillRect(hover.x * ts * zoom, hover.y * ts * zoom, ts * zoom, ts * zoom);
        }
      }
    });
  }, [canvasRef]);

  useEffect(() => {
    const unsub = useEditorStore.subscribe(scheduleRender);
    scheduleRender();
    return () => {
      unsub();
      cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleRender]);

  // Animation preview tick — only active when scene has animated tiles or group animations
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const startTick = () => {
      const state = useEditorStore.getState();
      const hasAnims = state.tileset?.ref.animations && Object.keys(state.tileset.ref.animations).length > 0;
      const hasGroups = (state.scene.groupAnimations?.length ?? 0) > 0;
      if (hasAnims || hasGroups) {
        if (!interval) {
          interval = setInterval(() => { useEditorStore.getState().tickAnimation(); }, 250);
        }
      } else if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    startTick();
    const unsub = useEditorStore.subscribe(startTick);
    return () => { unsub(); if (interval) clearInterval(interval); };
  }, []);

  const toGrid = useCallback(
    (e: MouseEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const zoom = useEditorStore.getState().zoom;
      const ts = useEditorStore.getState().scene.tileSize;
      const x = Math.floor((e.clientX - rect.left) / (ts * zoom));
      const y = Math.floor((e.clientY - rect.top) / (ts * zoom));
      return { x, y };
    },
    [canvasRef],
  );

  const applyTool = useCallback(
    (gx: number, gy: number, isDrag = false) => {
      const state = useEditorStore.getState();
      if (state.editorMode === 'game') {
        const { activeGameTool, paintCollision } = state;
        // Collision is paintable via drag; entity tools only fire on initial click
        if (activeGameTool === 'collision') paintCollision(gx, gy, true);
        else if (!isDrag) {
          if (activeGameTool === 'spawn') state.setSpawnPoint(gx, gy);
          else if (activeGameTool === 'exit') state.addExitZone(gx, gy, gx, gy);
          else if (activeGameTool === 'npc') state.addNpc(gx, gy);
          else if (activeGameTool === 'action') state.addAction(gx, gy);
        }
        return;
      }
      const { activeTool, paintTile, eraseTile, paintColor, brushStamp, stampBrush } = state;
      if (activeTool === 'paint') {
        if (brushStamp) stampBrush(gx, gy);
        else paintTile(gx, gy);
      }
      else if (activeTool === 'erase') eraseTile(gx, gy);
      else if (activeTool === 'colorPaint') paintColor(gx, gy);
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      const pos = toGrid(e);
      if (!pos) return;

      // Game mode: right-click erases collision
      const state = useEditorStore.getState();
      if (state.editorMode === 'game' && state.activeGameTool === 'collision') {
        if (e.button === 0) {
          isPaintingRef.current = true;
          applyTool(pos.x, pos.y);
        } else if (e.button === 2) {
          e.preventDefault();
          state.paintCollision(pos.x, pos.y, false);
          isPaintingRef.current = true;
        }
        return;
      }

      if (e.button !== 0) return;
      const { activeTool, clipboard } = state;

      if (activeTool === 'select') {
        if (clipboard) {
          useEditorStore.getState().stampClipboard(pos.x, pos.y);
        } else {
          selectionStartRef.current = pos;
          isDraggingSelectionRef.current = true;
          useEditorStore.getState().selectArea(pos.x, pos.y, pos.x, pos.y);
        }
      } else {
        isPaintingRef.current = true;
        applyTool(pos.x, pos.y);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const pos = toGrid(e);
      hoverRef.current = pos;
      if (isDraggingSelectionRef.current && pos && selectionStartRef.current) {
        useEditorStore.getState().selectArea(
          selectionStartRef.current.x, selectionStartRef.current.y,
          pos.x, pos.y,
        );
      } else if (isPaintingRef.current && pos) {
        // Right-click drag erases collision in game mode
        const s = useEditorStore.getState();
        if (s.editorMode === 'game' && s.activeGameTool === 'collision' && e.buttons === 2) {
          s.paintCollision(pos.x, pos.y, false);
        } else {
          applyTool(pos.x, pos.y, true);
        }
      }
      scheduleRender();
    };

    const onMouseUp = () => {
      if (isDraggingSelectionRef.current) {
        isDraggingSelectionRef.current = false;
        selectionStartRef.current = null;
        useEditorStore.getState().copySelection();
      }
      isPaintingRef.current = false;
    };

    const onMouseLeave = () => {
      isPaintingRef.current = false;
      isDraggingSelectionRef.current = false;
      selectionStartRef.current = null;
      hoverRef.current = null;
      scheduleRender();
    };

    const onContextMenu = (e: MouseEvent) => {
      if (useEditorStore.getState().editorMode === 'game') e.preventDefault();
    };
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [canvasRef, toGrid, applyTool, scheduleRender]);
}
