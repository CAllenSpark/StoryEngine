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

      // Hover highlight
      if (hover && hover.x >= 0 && hover.x < scene.width && hover.y >= 0 && hover.y < scene.height) {
        ctx.fillStyle = HOVER_COLOR;
        ctx.fillRect(hover.x * ts * zoom, hover.y * ts * zoom, ts * zoom, ts * zoom);
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
    (gx: number, gy: number) => {
      const { activeTool, paintTile, eraseTile, paintColor } = useEditorStore.getState();
      if (activeTool === 'paint') paintTile(gx, gy);
      else if (activeTool === 'erase') eraseTile(gx, gy);
      else if (activeTool === 'colorPaint') paintColor(gx, gy);
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const pos = toGrid(e);
      if (!pos) return;
      const { activeTool, clipboard } = useEditorStore.getState();

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
        applyTool(pos.x, pos.y);
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

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [canvasRef, toGrid, applyTool, scheduleRender]);
}
