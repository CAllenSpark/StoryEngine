import { useRef, useEffect, useState } from 'react';

interface ImportDialogProps {
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  fileName: string;
  detectedSizes: number[];
  selectedTileSize: number;
  hasExistingTileset: boolean;
  onSelectTileSize: (size: number) => void;
  onConfirm: () => void;
  onMerge: () => void;
  onAutoTile: () => void;
  onCancel: () => void;
}

const PREVIEW_MAX = 384;

export function ImportDialog(props: ImportDialogProps) {
  const {
    imageDataUrl, imageWidth, imageHeight, fileName,
    detectedSizes, selectedTileSize,
    onSelectTileSize, onConfirm, onMerge, onAutoTile, onCancel,
    hasExistingTileset,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [customSize, setCustomSize] = useState('');

  const cols = Math.floor(imageWidth / selectedTileSize);
  const rows = Math.floor(imageHeight / selectedTileSize);
  const tileCount = cols * rows;
  const hasPartial = imageWidth % selectedTileSize !== 0 || imageHeight % selectedTileSize !== 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = Math.min(PREVIEW_MAX / imageWidth, PREVIEW_MAX / imageHeight, 1);
    const w = Math.round(imageWidth * scale);
    const h = Math.round(imageHeight * scale);
    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = false;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, w, h);
      ctx.strokeStyle = 'rgba(137, 180, 250, 0.5)';
      ctx.lineWidth = 1;
      const sz = selectedTileSize * scale;
      for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * sz + 0.5, 0);
        ctx.lineTo(x * sz + 0.5, rows * sz);
        ctx.stroke();
      }
      for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * sz + 0.5);
        ctx.lineTo(cols * sz, y * sz + 0.5);
        ctx.stroke();
      }
    };
    img.src = imageDataUrl;
  }, [imageDataUrl, imageWidth, imageHeight, selectedTileSize, cols, rows]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        style={{
          background: '#1e1e2e', border: '1px solid #313244',
          borderRadius: 8, padding: 16, maxWidth: 480,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>Import Tileset</div>
        <div style={{ fontSize: 12, color: '#a6adc8' }}>
          {fileName} &mdash; {imageWidth}&times;{imageHeight}px
        </div>

        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', alignSelf: 'center' }} />

        <div style={{ fontSize: 12 }}>
          <span style={{ fontWeight: 600 }}>Tile size: </span>
          <span>{selectedTileSize}&times;{selectedTileSize}px</span>
          <span style={{ color: '#6c7086', marginLeft: 8 }}>
            ({cols}&times;{rows} = {tileCount} tiles)
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {detectedSizes.map((s) => (
            <button
              key={s}
              className={s === selectedTileSize ? 'active' : ''}
              onClick={() => onSelectTileSize(s)}
            >
              {s}px
            </button>
          ))}
          <input
            type="number"
            min={1}
            placeholder="Custom"
            value={customSize}
            onChange={(e) => {
              setCustomSize(e.target.value);
              const v = parseInt(e.target.value, 10);
              if (v > 0) onSelectTileSize(v);
            }}
            style={{
              width: 60, background: '#313244', color: '#cdd6f4',
              border: '1px solid #45475a', borderRadius: 4,
              padding: '2px 6px', fontSize: 12,
            }}
          />
        </div>

        {tileCount > 256 && (
          <span style={{ fontSize: 11, color: '#f9e2af' }}>
            Warning: {tileCount} tiles — large tileset may be slow
          </span>
        )}
        {hasPartial && (
          <span style={{ fontSize: 11, color: '#f9e2af' }}>
            Warning: image dimensions are not a multiple of {selectedTileSize} — partial tiles will be cropped
          </span>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onAutoTile} disabled={tileCount === 0}>
            Auto-Tile
          </button>
          {hasExistingTileset && (
            <button onClick={onMerge} disabled={tileCount === 0}>
              Merge (+{tileCount})
            </button>
          )}
          <button className="active" onClick={onConfirm} disabled={tileCount === 0}>
            {hasExistingTileset ? 'Replace' : 'Confirm'} ({tileCount})
          </button>
        </div>
      </div>
    </div>
  );
}
