import { useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { useTilesetImport } from '../hooks/useTilesetImport.js';
import { TILE_SIZE } from '@storyengine/shared';

const PALETTE_SCALE = 2;

export function TilesetPanel() {
  const tileset = useEditorStore((s) => s.tileset);
  const selectedTileId = useEditorStore((s) => s.selectedTileId);
  const setSelectedTile = useEditorStore((s) => s.setSelectedTile);
  const { importTileset, isLoading, error, warnings } = useTilesetImport();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const columns = tileset?.ref.columns ?? 0;
  const tileCount = tileset?.tileImages.length ?? 0;
  const rows = columns > 0 ? Math.ceil(tileCount / columns) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tileset || tileCount === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = columns * TILE_SIZE * PALETTE_SCALE;
    const h = rows * TILE_SIZE * PALETTE_SCALE;
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
          col * TILE_SIZE * PALETTE_SCALE,
          row * TILE_SIZE * PALETTE_SCALE,
          TILE_SIZE * PALETTE_SCALE,
          TILE_SIZE * PALETTE_SCALE,
        );
      }
    }

    if (selectedTileId >= 0 && selectedTileId < tileCount) {
      const sc = selectedTileId % columns;
      const sr = Math.floor(selectedTileId / columns);
      ctx.strokeStyle = '#89b4fa';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        sc * TILE_SIZE * PALETTE_SCALE + 1,
        sr * TILE_SIZE * PALETTE_SCALE + 1,
        TILE_SIZE * PALETTE_SCALE - 2,
        TILE_SIZE * PALETTE_SCALE - 2,
      );
    }
  }, [tileset, tileCount, columns, rows, selectedTileId]);

  const handlePaletteClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!tileset || columns === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.floor(
        (e.clientX - rect.left) / (TILE_SIZE * PALETTE_SCALE),
      );
      const y = Math.floor(
        (e.clientY - rect.top) / (TILE_SIZE * PALETTE_SCALE),
      );
      const id = y * columns + x;
      if (id >= 0 && id < tileCount) {
        setSelectedTile(id);
      }
    },
    [tileset, columns, tileCount, setSelectedTile],
  );

  return (
    <div
      style={{
        width: 200,
        flexShrink: 0,
        borderRight: '1px solid #313244',
        display: 'flex',
        flexDirection: 'column',
        padding: 8,
        gap: 8,
        overflow: 'auto',
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
            <span
              key={i}
              style={{
                fontSize: 11,
                color: w.level === 'warn' ? '#f9e2af' : '#a6adc8',
              }}
            >
              {w.level === 'warn' ? 'Warning: ' : 'Info: '}{w.message}
            </span>
          ))}
        </div>
      )}
      {tileset ? (
        <canvas
          ref={canvasRef}
          onClick={handlePaletteClick}
          style={{ imageRendering: 'pixelated', cursor: 'pointer' }}
        />
      ) : (
        <span style={{ fontSize: 12, color: '#6c7086' }}>
          No tileset loaded. Import a PNG to get started.
        </span>
      )}
    </div>
  );
}
