import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore.js';

interface AnimationDialogProps {
  baseTileId: number;
  onClose: () => void;
}

export function AnimationDialog({ baseTileId, onClose }: AnimationDialogProps) {
  const tileset = useEditorStore((s) => s.tileset);
  const existing = tileset?.ref.animations?.[String(baseTileId)];
  const [frames, setFrames] = useState<number[]>(existing?.frames ?? [baseTileId]);
  const [speed, setSpeed] = useState(existing?.speed ?? 4);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [previewFrame, setPreviewFrame] = useState(0);

  const tileSize = tileset?.ref.tileSize ?? 16;

  // Animate the preview
  useEffect(() => {
    if (frames.length < 2) return;
    const interval = setInterval(() => {
      setPreviewFrame((f) => (f + 1) % frames.length);
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [frames, speed]);

  // Draw preview
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !tileset) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sz = tileSize * 4;
    canvas.width = sz;
    canvas.height = sz;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, sz, sz);
    const id = frames[previewFrame] ?? baseTileId;
    if (id >= 0 && id < tileset.tileImages.length) {
      ctx.drawImage(tileset.tileImages[id], 0, 0, sz, sz);
    }
  }, [tileset, frames, previewFrame, baseTileId, tileSize]);

  const addFrame = (tileId: number) => {
    setFrames((f) => [...f, tileId]);
  };

  const removeFrame = (index: number) => {
    setFrames((f) => f.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (frames.length >= 2) {
      useEditorStore.getState().setTileAnimation(baseTileId, frames, speed);
    }
    onClose();
  };

  const handleRemove = () => {
    useEditorStore.getState().removeTileAnimation(baseTileId);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#1e1e2e', border: '1px solid #313244',
          borderRadius: 8, padding: 16, maxWidth: 360,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          Tile Animation — Tile #{baseTileId}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <canvas
            ref={previewRef}
            style={{ imageRendering: 'pixelated', border: '1px solid #313244' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Speed: </span>
              <input
                type="range" min={1} max={12} value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                style={{ width: 80, verticalAlign: 'middle' }}
              />
              <span style={{ marginLeft: 4 }}>{speed} fps</span>
            </div>
            <div style={{ fontSize: 11, color: '#a6adc8' }}>
              {frames.length} frame{frames.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600 }}>Frames:</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {frames.map((fId, i) => (
            <div
              key={i}
              style={{
                width: 32, height: 32, position: 'relative',
                border: '1px solid #45475a', borderRadius: 2,
                overflow: 'hidden', cursor: 'pointer',
              }}
              onClick={() => removeFrame(i)}
              title={`Tile #${fId} — click to remove`}
            >
              {tileset && fId < tileset.tileImages.length && (
                <FrameThumb tileset={tileset} tileId={fId} />
              )}
              <span style={{
                position: 'absolute', bottom: 0, right: 1,
                fontSize: 8, color: '#cdd6f4', textShadow: '0 0 2px #000',
              }}>{fId}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: '#a6adc8' }}>
          Click a tile below to add it as a frame. Click a frame above to remove it.
        </div>

        {tileset && (
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxHeight: 120, overflow: 'auto' }}>
            {tileset.tileImages.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 24, height: 24, border: '1px solid #313244',
                  borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
                }}
                onClick={() => addFrame(i)}
                title={`Tile #${i}`}
              >
                <FrameThumb tileset={tileset} tileId={i} />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {existing && (
            <button onClick={handleRemove} style={{ color: '#f38ba8' }}>
              Remove Animation
            </button>
          )}
          <button onClick={onClose}>Cancel</button>
          <button className="active" onClick={handleSave} disabled={frames.length < 2}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function FrameThumb({ tileset, tileId }: { tileset: { tileImages: ImageBitmap[]; ref: { tileSize: number } }; tileId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sz = canvas.width;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, sz, sz);
    if (tileId < tileset.tileImages.length) {
      ctx.drawImage(tileset.tileImages[tileId], 0, 0, sz, sz);
    }
  }, [tileset, tileId]);

  return <canvas ref={canvasRef} width={32} height={32} style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }} />;
}
