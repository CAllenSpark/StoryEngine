import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import type { SpriteSheetDef, SpriteAnimState } from '@storyengine/shared';

interface SpriteSheetImportDialogProps {
  onClose: () => void;
  /** If provided, edit an existing sheet instead of creating a new one. */
  existingId?: string;
}

/** Standard state name vocabulary — maps directly to Actor facing + velocity. */
const STATE_VOCAB = [
  'idle-down', 'walk-down',
  'idle-up', 'walk-up',
  'idle-left', 'walk-left',
  'idle-right', 'walk-right',
  'interact', 'talk', 'emote', 'hurt', 'custom',
] as const;

const DEFAULT_FPS_BY_STATE: Record<string, number> = {
  'idle-down': 2, 'idle-up': 2, 'idle-left': 2, 'idle-right': 2,
  'walk-down': 8, 'walk-up': 8, 'walk-left': 8, 'walk-right': 8,
  'interact': 6, 'talk': 4, 'emote': 8, 'hurt': 6, 'custom': 6,
};

const FRAME_SIZE_OPTIONS = [8, 16, 24, 32, 48];

export function SpriteSheetImportDialog({ onClose, existingId }: SpriteSheetImportDialogProps) {
  const sheetLibrary = useEditorStore((s) => s.spriteSheetLibrary);
  const existing = existingId ? sheetLibrary.find((s) => s.id === existingId) : null;

  const [dataUrl, setDataUrl] = useState<string | null>(existing?.dataUrl ?? null);
  const [name, setName] = useState(existing?.def.name ?? 'Character');
  const [frameWidth, setFrameWidth] = useState(existing?.def.frameWidth ?? 16);
  const [frameHeight, setFrameHeight] = useState(existing?.def.frameHeight ?? 24);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [states, setStates] = useState<SpriteAnimState[]>(existing?.def.states ?? []);
  const [previewStateIdx, setPreviewStateIdx] = useState<number>(-1);
  const [previewFrame, setPreviewFrame] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const columns = imgDims ? Math.floor(imgDims.w / frameWidth) : 0;
  const rows = imgDims ? Math.floor(imgDims.h / frameHeight) : 0;

  // Load image whenever dataUrl changes
  useEffect(() => {
    if (!dataUrl) {
      imgRef.current = null;
      setImgDims(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = dataUrl;
  }, [dataUrl]);

  // Draw the spritesheet with grid overlay
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas || !imgRef.current || !imgDims) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 2;
    canvas.width = imgDims.w * scale;
    canvas.height = imgDims.h * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

    // Grid overlay
    ctx.strokeStyle = 'rgba(137, 180, 250, 0.5)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= columns; c++) {
      const x = c * frameWidth * scale;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * frameHeight * scale;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.width, y + 0.5);
      ctx.stroke();
    }

    // Highlight defined state rows
    const STATE_COLORS = ['#a6e3a1', '#f9e2af', '#cba6f7', '#89b4fa', '#fab387', '#94e2d5', '#f38ba8'];
    states.forEach((state, idx) => {
      const color = STATE_COLORS[idx % STATE_COLORS.length];
      const x = state.colStart * frameWidth * scale;
      const y = state.row * frameHeight * scale;
      const w = state.frameCount * frameWidth * scale;
      const h = frameHeight * scale;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = color;
      ctx.font = `bold ${Math.max(10, frameHeight * scale * 0.35)}px monospace`;
      ctx.fillText(state.name, x + 4, y + frameHeight * scale - 4);
    });
  }, [imgDims, frameWidth, frameHeight, columns, rows, states]);

  // Animate preview
  useEffect(() => {
    if (previewStateIdx < 0 || previewStateIdx >= states.length) return;
    const state = states[previewStateIdx];
    if (state.frameCount <= 1) {
      setPreviewFrame(0);
      return;
    }
    const interval = setInterval(() => {
      setPreviewFrame((f) => (f + 1) % state.frameCount);
    }, 1000 / state.fps);
    return () => clearInterval(interval);
  }, [previewStateIdx, states]);

  // Draw preview
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (previewStateIdx < 0 || previewStateIdx >= states.length) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const state = states[previewStateIdx];
    const scale = 4;
    canvas.width = frameWidth * scale;
    canvas.height = frameHeight * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sx = (state.colStart + previewFrame) * frameWidth;
    const sy = state.row * frameHeight;
    ctx.drawImage(
      imgRef.current,
      sx, sy, frameWidth, frameHeight,
      0, 0, canvas.width, canvas.height,
    );
  }, [previewStateIdx, previewFrame, states, frameWidth, frameHeight]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDataUrl(reader.result as string);
      // Reset states on new image
      if (!existingId) setStates([]);
    };
    reader.readAsDataURL(file);
  }, [existingId]);

  const handleAddState = useCallback(() => {
    // Auto-pick the first unused vocab state
    const used = new Set(states.map((s) => s.name));
    const nextName = STATE_VOCAB.find((v) => !used.has(v)) ?? 'custom';
    const nextRow = states.length > 0 ? Math.min(states[states.length - 1].row + 1, rows - 1) : 0;
    setStates([...states, {
      name: nextName,
      row: Math.max(0, nextRow),
      colStart: 0,
      frameCount: Math.min(columns, nextName.startsWith('walk') ? 4 : 1),
      fps: DEFAULT_FPS_BY_STATE[nextName] ?? 6,
      loop: !['interact', 'hurt', 'emote'].includes(nextName),
    }]);
  }, [states, rows, columns]);

  const updateState = useCallback((idx: number, patch: Partial<SpriteAnimState>) => {
    setStates((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }, []);

  const removeState = useCallback((idx: number) => {
    setStates((prev) => prev.filter((_, i) => i !== idx));
    if (previewStateIdx === idx) setPreviewStateIdx(-1);
  }, [previewStateIdx]);

  const canSave = useMemo(() => {
    return !!dataUrl && !!imgDims && states.length > 0 && columns > 0 && rows > 0;
  }, [dataUrl, imgDims, states.length, columns, rows]);

  const handleSave = useCallback(async () => {
    if (!canSave || !dataUrl || !imgDims) return;
    const defaultState = states.find((s) => s.name.startsWith('idle'))?.name ?? states[0].name;
    const def: SpriteSheetDef = {
      id: existingId ?? crypto.randomUUID(),
      name,
      frameWidth,
      frameHeight,
      columns,
      rows,
      states,
      defaultState,
    };
    await useEditorStore.getState().saveSpriteSheet(def, dataUrl);
    onClose();
  }, [canSave, dataUrl, imgDims, name, frameWidth, frameHeight, columns, rows, states, existingId, onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1500,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#1e1e2e', border: '1px solid #313244',
          borderRadius: 8, padding: 16, width: 720, maxWidth: '95vw',
          maxHeight: '90vh', overflow: 'auto',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {existingId ? 'Edit' : 'Import'} Sprite Sheet
        </div>

        {/* Name + file picker */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11 }}>Name:</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button onClick={() => fileInputRef.current?.click()} style={{ fontSize: 11 }}>
            {dataUrl ? 'Replace Image' : 'Choose PNG...'}
          </button>
        </div>

        {/* Frame size controls */}
        {dataUrl && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 11 }}>
            <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              Frame W:
              <select
                value={frameWidth}
                onChange={(e) => setFrameWidth(Number(e.target.value))}
                style={selectStyle}
              >
                {FRAME_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              Frame H:
              <select
                value={frameHeight}
                onChange={(e) => setFrameHeight(Number(e.target.value))}
                style={selectStyle}
              >
                {FRAME_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            {imgDims && (
              <span style={{ color: '#6c7086' }}>
                Grid: {columns} × {rows} cells ({imgDims.w}×{imgDims.h} px)
              </span>
            )}
          </div>
        )}

        {/* Grid preview + live preview side by side */}
        {dataUrl && imgDims && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{
              flex: 1, maxHeight: 300, overflow: 'auto',
              border: '1px solid #313244', borderRadius: 4, padding: 4,
              background: '#11111b',
            }}>
              <canvas ref={gridCanvasRef} style={{ imageRendering: 'pixelated', display: 'block' }} />
            </div>
            {previewStateIdx >= 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: 8, background: '#11111b', border: '1px solid #313244',
                borderRadius: 4, minWidth: 100,
              }}>
                <span style={{ fontSize: 10, color: '#6c7086' }}>Preview</span>
                <canvas ref={previewCanvasRef} style={{ imageRendering: 'pixelated' }} />
                <span style={{ fontSize: 10, color: '#cba6f7' }}>
                  {states[previewStateIdx]?.name}
                </span>
              </div>
            )}
          </div>
        )}

        {/* States list */}
        {dataUrl && imgDims && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Animation States</span>
              <button onClick={handleAddState} style={{ fontSize: 10 }}>+ Add State</button>
            </div>
            {states.length === 0 && (
              <span style={{ fontSize: 11, color: '#6c7086' }}>
                Click "Add State" to start tagging rows. Use the standard vocabulary (walk-down, idle-left, etc.)
                so the engine can auto-resolve the right animation based on player movement.
              </span>
            )}
            {states.map((state, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap',
                  padding: 4, background: previewStateIdx === idx ? '#313244' : 'transparent',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
                onClick={() => setPreviewStateIdx(idx)}
              >
                <select
                  value={STATE_VOCAB.includes(state.name as typeof STATE_VOCAB[number]) ? state.name : 'custom'}
                  onChange={(e) => {
                    const v = e.target.value;
                    const newName = v === 'custom' ? (state.name.startsWith('custom-') ? state.name : 'custom-new') : v;
                    updateState(idx, { name: newName, fps: DEFAULT_FPS_BY_STATE[v] ?? state.fps });
                  }}
                  style={selectStyle}
                  onClick={(e) => e.stopPropagation()}
                >
                  {STATE_VOCAB.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                {state.name.startsWith('custom') && (
                  <input
                    type="text"
                    value={state.name}
                    onChange={(e) => updateState(idx, { name: e.target.value })}
                    placeholder="custom-name"
                    style={{ ...inputStyle, width: 100 }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <label style={labelStyle} onClick={(e) => e.stopPropagation()}>
                  row
                  <input
                    type="number" min={0} max={rows - 1}
                    value={state.row}
                    onChange={(e) => updateState(idx, { row: Number(e.target.value) })}
                    style={{ ...inputStyle, width: 38 }}
                  />
                </label>
                <label style={labelStyle} onClick={(e) => e.stopPropagation()}>
                  col
                  <input
                    type="number" min={0} max={Math.max(0, columns - 1)}
                    value={state.colStart}
                    onChange={(e) => updateState(idx, { colStart: Number(e.target.value) })}
                    style={{ ...inputStyle, width: 32 }}
                  />
                </label>
                <label style={labelStyle} onClick={(e) => e.stopPropagation()}>
                  frames
                  <input
                    type="number" min={1} max={columns}
                    value={state.frameCount}
                    onChange={(e) => updateState(idx, { frameCount: Math.max(1, Number(e.target.value)) })}
                    style={{ ...inputStyle, width: 32 }}
                  />
                </label>
                <label style={labelStyle} onClick={(e) => e.stopPropagation()}>
                  fps
                  <input
                    type="number" min={1} max={30}
                    value={state.fps}
                    onChange={(e) => updateState(idx, { fps: Math.max(1, Number(e.target.value)) })}
                    style={{ ...inputStyle, width: 32 }}
                  />
                </label>
                <label style={{ ...labelStyle, gap: 2 }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={state.loop ?? true}
                    onChange={(e) => updateState(idx, { loop: e.target.checked })}
                  />
                  loop
                </label>
                <button
                  onClick={(e) => { e.stopPropagation(); removeState(idx); }}
                  style={{ fontSize: 9, color: '#f38ba8', padding: '0 3px', marginLeft: 'auto' }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Cancel</button>
          <button
            className="active"
            onClick={handleSave}
            disabled={!canSave}
            style={{ opacity: canSave ? 1 : 0.5 }}
          >
            Save Sprite Sheet
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  background: '#313244', color: '#cdd6f4',
  border: '1px solid #45475a', borderRadius: 3,
  padding: '2px 4px', fontSize: 11,
} as const;

const selectStyle = {
  background: '#313244', color: '#cdd6f4',
  border: '1px solid #45475a', borderRadius: 3,
  padding: '1px 2px', fontSize: 10,
} as const;

const labelStyle = {
  display: 'flex', alignItems: 'center', gap: 3,
  fontSize: 10, color: '#a6adc8',
} as const;
