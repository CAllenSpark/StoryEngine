import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { TILE_SIZE } from '@storyengine/shared';
import { useEditorStore } from '../store/editorStore.js';

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

  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = useEditorStore.getState();
      const { scene, layerVisibility, zoom, tileset } = state;
      const w = scene.width * TILE_SIZE * zoom;
      const h = scene.height * TILE_SIZE * zoom;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);

      for (let li = 0; li < scene.layers.length; li++) {
        if (!layerVisibility[li]) continue;
        const layer = scene.layers[li];
        for (let y = 0; y < scene.height; y++) {
          for (let x = 0; x < scene.width; x++) {
            const tileId = layer.data[y * scene.width + x];
            if (tileId < 0) continue;
            const px = x * TILE_SIZE * zoom;
            const py = y * TILE_SIZE * zoom;
            const sz = TILE_SIZE * zoom;

            if (tileset && tileId < tileset.tileImages.length) {
              ctx.drawImage(tileset.tileImages[tileId], px, py, sz, sz);
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
        const px = x * TILE_SIZE * zoom;
        ctx.beginPath();
        ctx.moveTo(px + 0.5, 0);
        ctx.lineTo(px + 0.5, h);
        ctx.stroke();
      }
      for (let y = 0; y <= scene.height; y++) {
        const py = y * TILE_SIZE * zoom;
        ctx.beginPath();
        ctx.moveTo(0, py + 0.5);
        ctx.lineTo(w, py + 0.5);
        ctx.stroke();
      }

      const hover = hoverRef.current;
      if (hover && hover.x >= 0 && hover.x < scene.width && hover.y >= 0 && hover.y < scene.height) {
        ctx.fillStyle = HOVER_COLOR;
        ctx.fillRect(
          hover.x * TILE_SIZE * zoom,
          hover.y * TILE_SIZE * zoom,
          TILE_SIZE * zoom,
          TILE_SIZE * zoom,
        );
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

  const toGrid = useCallback(
    (e: MouseEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const zoom = useEditorStore.getState().zoom;
      const x = Math.floor((e.clientX - rect.left) / (TILE_SIZE * zoom));
      const y = Math.floor((e.clientY - rect.top) / (TILE_SIZE * zoom));
      return { x, y };
    },
    [canvasRef],
  );

  const applyTool = useCallback(
    (gx: number, gy: number) => {
      const { activeTool, paintTile, eraseTile } = useEditorStore.getState();
      if (activeTool === 'paint') paintTile(gx, gy);
      else eraseTile(gx, gy);
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isPaintingRef.current = true;
      const pos = toGrid(e);
      if (pos) applyTool(pos.x, pos.y);
    };

    const onMouseMove = (e: MouseEvent) => {
      const pos = toGrid(e);
      hoverRef.current = pos;
      if (isPaintingRef.current && pos) {
        applyTool(pos.x, pos.y);
      }
      scheduleRender();
    };

    const onMouseUp = () => {
      isPaintingRef.current = false;
    };

    const onMouseLeave = () => {
      isPaintingRef.current = false;
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
