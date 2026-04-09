import { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { useTilesetImport } from '../hooks/useTilesetImport.js';
import { ImportDialog } from './ImportDialog.js';
import { AnimationDialog } from './AnimationDialog.js';
import type { BrushTile } from '../types/editor.js';

const PALETTE_SCALE = 2;

export function TilesetPanel() {
  const tileset = useEditorStore((s) => s.tileset);
  const selectedTileId = useEditorStore((s) => s.selectedTileId);
  const brushStamp = useEditorStore((s) => s.brushStamp);
  const setSelectedTile = useEditorStore((s) => s.setSelectedTile);
  const {
    importTileset, commitImport, commitMerge, isLoading, error, warnings,
    dialogState, closeDialog, setSelectedTileSize,
  } = useTilesetImport();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredTileId, setHoveredTileId] = useState<number>(-1);
  const [animDialogTileId, setAnimDialogTileId] = useState<number | null>(null);
  const dragStartRef = useRef<{ col: number; row: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ col: number; row: number } | null>(null);
  const isDraggingRef = useRef(false);

  const tileSize = tileset?.ref.tileSize ?? 16;
  const columns = tileset?.ref.columns ?? 0;
  const tileCount = tileset?.tileImages.length ?? 0;
  const rows = columns > 0 ? Math.ceil(tileCount / columns) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tileset || tileCount === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = columns * tileSize * PALETTE_SCALE;
    const h = rows * tileSize * PALETTE_SCALE;
    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < tileCount; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const bmp = tileset.tileImages[i];
      if (bmp) {
        ctx.drawImage(
          bmp,
          col * tileSize * PALETTE_SCALE,
          row * tileSize * PALETTE_SCALE,
          tileSize * PALETTE_SCALE,
          tileSize * PALETTE_SCALE,
        );
      }
    }

    // Draw animation badges
    const anims = tileset.ref.animations;
    if (anims) {
      for (const key of Object.keys(anims)) {
        const id = Number(key);
        if (id < 0 || id >= tileCount) continue;
        const ac = id % columns;
        const ar = Math.floor(id / columns);
        const apx = ac * tileSize * PALETTE_SCALE;
        const apy = ar * tileSize * PALETTE_SCALE;
        ctx.fillStyle = 'rgba(137, 180, 250, 0.8)';
        ctx.beginPath();
        ctx.moveTo(apx + 2, apy + 2);
        ctx.lineTo(apx + 10, apy + 7);
        ctx.lineTo(apx + 2, apy + 12);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Draw brush selection rectangle (multi-tile)
    if (brushStamp && brushStamp.tiles.length > 1) {
      const minC = Math.min(...brushStamp.tiles.map((t) => t.dx));
      const minR = Math.min(...brushStamp.tiles.map((t) => t.dy));
      // Find the anchor tile ID to locate it in the palette
      const anchorTile = brushStamp.tiles.find((t) => t.dx === 0 && t.dy === 0);
      if (anchorTile) {
        const anchorCol = anchorTile.tileId % columns;
        const anchorRow = Math.floor(anchorTile.tileId / columns);
        const startCol = anchorCol + minC;
        const startRow = anchorRow + minR;
        ctx.strokeStyle = '#f9e2af';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(
          startCol * tileSize * PALETTE_SCALE + 1,
          startRow * tileSize * PALETTE_SCALE + 1,
          brushStamp.width * tileSize * PALETTE_SCALE - 2,
          brushStamp.height * tileSize * PALETTE_SCALE - 2,
        );
        ctx.setLineDash([]);
      }
    } else if (selectedTileId >= 0 && selectedTileId < tileCount) {
      const sc = selectedTileId % columns;
      const sr = Math.floor(selectedTileId / columns);
      ctx.strokeStyle = '#89b4fa';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        sc * tileSize * PALETTE_SCALE + 1,
        sr * tileSize * PALETTE_SCALE + 1,
        tileSize * PALETTE_SCALE - 2,
        tileSize * PALETTE_SCALE - 2,
      );
    }

    // Draw in-progress drag selection
    if (dragStartRef.current && dragEnd) {
      const ds = dragStartRef.current;
      const c1 = Math.min(ds.col, dragEnd.col);
      const r1 = Math.min(ds.row, dragEnd.row);
      const c2 = Math.max(ds.col, dragEnd.col);
      const r2 = Math.max(ds.row, dragEnd.row);
      ctx.fillStyle = 'rgba(249, 226, 175, 0.2)';
      ctx.fillRect(
        c1 * tileSize * PALETTE_SCALE,
        r1 * tileSize * PALETTE_SCALE,
        (c2 - c1 + 1) * tileSize * PALETTE_SCALE,
        (r2 - r1 + 1) * tileSize * PALETTE_SCALE,
      );
      ctx.strokeStyle = '#f9e2af';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        c1 * tileSize * PALETTE_SCALE + 1,
        r1 * tileSize * PALETTE_SCALE + 1,
        (c2 - c1 + 1) * tileSize * PALETTE_SCALE - 2,
        (r2 - r1 + 1) * tileSize * PALETTE_SCALE - 2,
      );
    }
  }, [tileset, tileSize, tileCount, columns, rows, selectedTileId, brushStamp, dragEnd]);

  const tileAtMouse = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!tileset || columns === 0) return null;
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = e.currentTarget.width / rect.width;
      const scaleY = e.currentTarget.height / rect.height;
      const col = Math.floor(((e.clientX - rect.left) * scaleX) / (tileSize * PALETTE_SCALE));
      const row = Math.floor(((e.clientY - rect.top) * scaleY) / (tileSize * PALETTE_SCALE));
      const id = row * columns + col;
      if (id < 0 || id >= tileCount) return null;
      return { col, row, id };
    },
    [tileset, tileSize, columns, tileCount],
  );

  const handlePaletteMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = tileAtMouse(e);
      if (!hit) return;
      dragStartRef.current = { col: hit.col, row: hit.row };
      setDragEnd({ col: hit.col, row: hit.row });
      isDraggingRef.current = true;
    },
    [tileAtMouse],
  );

  const handlePaletteMouseMove2 = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Update hover
      const hit = tileAtMouse(e);
      setHoveredTileId(hit ? hit.id : -1);
      // Update drag end
      if (isDraggingRef.current && hit) {
        setDragEnd({ col: hit.col, row: hit.row });
      }
    },
    [tileAtMouse],
  );

  const handlePaletteMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current || !dragStartRef.current) return;
      isDraggingRef.current = false;
      const hit = tileAtMouse(e);
      const end = hit ?? dragEnd;
      if (!end) { dragStartRef.current = null; setDragEnd(null); return; }

      const ds = dragStartRef.current;
      const c1 = Math.min(ds.col, end.col);
      const r1 = Math.min(ds.row, end.row);
      const c2 = Math.max(ds.col, end.col);
      const r2 = Math.max(ds.row, end.row);

      // Single-tile click: select as before
      if (c1 === c2 && r1 === r2) {
        const id = r1 * columns + c1;
        setSelectedTile(id);
        useEditorStore.getState().setBrushStamp(null);
        useEditorStore.getState().setActiveTool('paint');
      } else {
        // Multi-tile drag: build brush stamp
        const tiles: BrushTile[] = [];
        const anchorCol = c1;
        const anchorRow = r1;
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            const tileId = r * columns + c;
            if (tileId >= 0 && tileId < tileCount) {
              tiles.push({ dx: c - anchorCol, dy: r - anchorRow, tileId });
            }
          }
        }
        useEditorStore.getState().setBrushStamp({
          width: c2 - c1 + 1,
          height: r2 - r1 + 1,
          tiles,
        });
        // Also select the anchor tile for single-tile fallback display
        setSelectedTile(r1 * columns + c1);
      }
      dragStartRef.current = null;
      setDragEnd(null);
    },
    [tileAtMouse, dragEnd, columns, tileCount, setSelectedTile],
  );

  const handlePaletteContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!tileset || columns === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = e.currentTarget.width / rect.width;
      const scaleY = e.currentTarget.height / rect.height;
      const x = Math.floor(((e.clientX - rect.left) * scaleX) / (tileSize * PALETTE_SCALE));
      const y = Math.floor(((e.clientY - rect.top) * scaleY) / (tileSize * PALETTE_SCALE));
      const id = y * columns + x;
      if (id >= 0 && id < tileCount) {
        setAnimDialogTileId(id);
      }
    },
    [tileset, tileSize, columns, tileCount],
  );

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !tileset || hoveredTileId < 0 || hoveredTileId >= tileCount) {
      if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sz = tileSize * 4;
    canvas.width = sz;
    canvas.height = sz;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, sz, sz);
    ctx.drawImage(tileset.tileImages[hoveredTileId], 0, 0, sz, sz);
  }, [tileset, hoveredTileId, tileSize, tileCount]);

  return (
    <div
      style={{
        width: 200, flexShrink: 0, borderRight: '1px solid #313244',
        display: 'flex', flexDirection: 'column', padding: 8, gap: 8, overflow: 'auto',
      }}
    >
      <button onClick={importTileset} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Import Tileset'}
      </button>
      {error && (
        <span style={{ color: '#f38ba8', fontSize: 11 }}>{error}</span>
      )}
      {warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {warnings.map((w, i) => (
            <span key={i} style={{ fontSize: 11, color: w.level === 'warn' ? '#f9e2af' : '#a6adc8' }}>
              {w.level === 'warn' ? 'Warning: ' : 'Info: '}{w.message}
            </span>
          ))}
        </div>
      )}
      {tileset ? (
        <>
          <canvas
            ref={canvasRef}
            onMouseDown={handlePaletteMouseDown}
            onMouseMove={handlePaletteMouseMove2}
            onMouseUp={handlePaletteMouseUp}
            onMouseLeave={() => {
              setHoveredTileId(-1);
              if (isDraggingRef.current) {
                isDraggingRef.current = false;
                dragStartRef.current = null;
                setDragEnd(null);
              }
            }}
            onContextMenu={handlePaletteContextMenu}
            style={{ imageRendering: 'pixelated', cursor: 'crosshair' }}
          />
          {hoveredTileId >= 0 && hoveredTileId < tileCount && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <canvas
                ref={previewCanvasRef}
                style={{ imageRendering: 'pixelated', border: '1px solid #313244' }}
              />
              <span style={{ fontSize: 11, color: '#a6adc8' }}>Tile #{hoveredTileId}</span>
            </div>
          )}
          {brushStamp && brushStamp.tiles.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
              <span style={{ fontSize: 11, color: '#f9e2af' }}>
                Brush: {brushStamp.width}x{brushStamp.height} ({brushStamp.tiles.length} tiles)
              </span>
              <button
                onClick={() => useEditorStore.getState().setBrushStamp(null)}
                style={{ fontSize: 9, color: '#f38ba8', padding: '0 4px' }}
              >clear</button>
            </div>
          )}
          <span style={{ fontSize: 10, color: '#6c7086' }}>
            Click = single tile. Drag = multi-tile brush.
          </span>
        </>
      ) : (
        <span style={{ fontSize: 12, color: '#6c7086' }}>
          No tileset loaded. Import an image to get started.
        </span>
      )}
      {dialogState.isOpen && dialogState.imageDataUrl && (
        <ImportDialog
          imageDataUrl={dialogState.imageDataUrl}
          imageWidth={dialogState.imageWidth}
          imageHeight={dialogState.imageHeight}
          fileName={dialogState.fileName}
          detectedSizes={dialogState.detectedSizes}
          selectedTileSize={dialogState.selectedTileSize}
          hasExistingTileset={!!tileset}
          onSelectTileSize={setSelectedTileSize}
          onConfirm={() => commitImport(dialogState.selectedTileSize)}
          onMerge={() => commitMerge(dialogState.selectedTileSize)}
          onAutoTile={async () => {
            if (!dialogState.imageDataUrl) return;
            try {
              const img = new Image();
              await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Failed to load'));
                img.src = dialogState.imageDataUrl!;
              });
              await useEditorStore.getState().autoTileImage(img, dialogState.selectedTileSize);
              closeDialog();
            } catch (err) {
              console.error('Auto-tile failed', err);
            }
          }}
          onCancel={closeDialog}
        />
      )}
      {animDialogTileId !== null && (
        <AnimationDialog
          baseTileId={animDialogTileId}
          onClose={() => setAnimDialogTileId(null)}
        />
      )}
    </div>
  );
}
