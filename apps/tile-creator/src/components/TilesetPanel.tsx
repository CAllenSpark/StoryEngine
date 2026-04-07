import { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { useTilesetImport } from '../hooks/useTilesetImport.js';
import { ImportDialog } from './ImportDialog.js';

const PALETTE_SCALE = 2;

export function TilesetPanel() {
  const tileset = useEditorStore((s) => s.tileset);
  const selectedTileId = useEditorStore((s) => s.selectedTileId);
  const setSelectedTile = useEditorStore((s) => s.setSelectedTile);
  const {
    importTileset, commitImport, isLoading, error, warnings,
    dialogState, closeDialog, setSelectedTileSize,
  } = useTilesetImport();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredTileId, setHoveredTileId] = useState<number>(-1);

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

    if (selectedTileId >= 0 && selectedTileId < tileCount) {
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
  }, [tileset, tileSize, tileCount, columns, rows, selectedTileId]);

  const handlePaletteClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!tileset || columns === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / (tileSize * PALETTE_SCALE));
      const y = Math.floor((e.clientY - rect.top) / (tileSize * PALETTE_SCALE));
      const id = y * columns + x;
      if (id >= 0 && id < tileCount) {
        setSelectedTile(id);
      }
    },
    [tileset, tileSize, columns, tileCount, setSelectedTile],
  );

  const handlePaletteHover = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!tileset || columns === 0) { setHoveredTileId(-1); return; }
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / (tileSize * PALETTE_SCALE));
      const y = Math.floor((e.clientY - rect.top) / (tileSize * PALETTE_SCALE));
      const id = y * columns + x;
      setHoveredTileId(id >= 0 && id < tileCount ? id : -1);
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
            onClick={handlePaletteClick}
            onMouseMove={handlePaletteHover}
            onMouseLeave={() => setHoveredTileId(-1)}
            style={{ imageRendering: 'pixelated', cursor: 'pointer' }}
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
          onSelectTileSize={setSelectedTileSize}
          onConfirm={() => commitImport(dialogState.selectedTileSize)}
          onCancel={closeDialog}
        />
      )}
    </div>
  );
}
