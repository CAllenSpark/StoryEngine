import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { resolvePhaseFrame } from '@storyengine/shared';
import type { GroupAnimationPhase } from '@storyengine/shared';

interface GroupAnimationDialogProps {
  groupId: string;
  onClose: () => void;
}

export function GroupAnimationDialog({ groupId, onClose }: GroupAnimationDialogProps) {
  const scene = useEditorStore((s) => s.scene);
  const tileset = useEditorStore((s) => s.tileset);
  const group = (scene.groupAnimations ?? []).find((g) => g.id === groupId);

  const [phases, setPhases] = useState<GroupAnimationPhase[]>(group?.phases ?? []);
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
  const [previewClock, setPreviewClock] = useState(0);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const tileSize = tileset?.ref.tileSize ?? 16;
  const gw = group?.width ?? 0;
  const gh = group?.height ?? 0;

  // Preview tick
  useEffect(() => {
    const totalFrames = phases.reduce((s, p) => s + p.frames.length, 0);
    if (totalFrames < 2) return;
    const speed = phases[activePhaseIdx]?.speed ?? 4;
    const tickMs = 1000 / speed;
    const interval = setInterval(() => {
      setPreviewClock((c) => c + tickMs);
    }, tickMs);
    return () => clearInterval(interval);
  }, [phases, activePhaseIdx]);

  const currentFrame = (() => {
    const result = resolvePhaseFrame(phases, previewClock);
    if (!result) return undefined;
    return phases[result.phaseIndex]?.frames[result.frameIndex];
  })();

  // Draw preview
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !tileset || !currentFrame || gw === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = 3;
    const w = gw * tileSize * scale;
    const h = gh * tileSize * scale;
    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const id = currentFrame.tiles[y * gw + x];
        if (id >= 0 && id < tileset.tileImages.length) {
          ctx.drawImage(
            tileset.tileImages[id],
            x * tileSize * scale, y * tileSize * scale,
            tileSize * scale, tileSize * scale,
          );
        }
      }
    }
  }, [tileset, currentFrame, gw, gh, tileSize]);

  if (!group) return null;

  const handleCapture = () => {
    useEditorStore.getState().captureGroupFrame(groupId);
    const updated = (useEditorStore.getState().scene.groupAnimations ?? []).find((g) => g.id === groupId);
    if (updated) setPhases(updated.phases);
  };

  const handleSave = () => {
    useEditorStore.getState().updateGroupAnimation(groupId, phases);
    onClose();
  };

  const handleRemove = () => {
    useEditorStore.getState().removeGroupAnimation(groupId);
    onClose();
  };

  const updatePhase = (idx: number, patch: Partial<GroupAnimationPhase>) => {
    setPhases((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const removeFrame = (phaseIdx: number, frameIdx: number) => {
    setPhases((prev) => prev.map((p, i) =>
      i === phaseIdx ? { ...p, frames: p.frames.filter((_, fi) => fi !== frameIdx) } : p,
    ));
  };

  const addPhase = () => {
    setPhases((prev) => [...prev, { frames: [], speed: 4 }]);
    setActivePhaseIdx(phases.length);
  };

  const removePhase = (idx: number) => {
    if (phases.length <= 1) return;
    setPhases((prev) => prev.filter((_, i) => i !== idx));
    if (activePhaseIdx >= phases.length - 1) setActivePhaseIdx(Math.max(0, phases.length - 2));
  };

  const totalFrames = phases.reduce((s, p) => s + p.frames.length, 0);

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
          borderRadius: 8, padding: 16, maxWidth: 480, width: '100%',
          display: 'flex', flexDirection: 'column', gap: 10,
          maxHeight: '90vh', overflow: 'auto',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          Group Animation — {group.name} ({gw}x{gh})
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <canvas
            ref={previewRef}
            style={{ imageRendering: 'pixelated', border: '1px solid #313244', flexShrink: 0 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
            <div style={{ color: '#a6adc8' }}>
              Position: ({group.x}, {group.y}) — Layer {group.layer}
            </div>
            <div style={{ color: '#a6adc8' }}>
              {phases.length} phase{phases.length !== 1 ? 's' : ''}, {totalFrames} frames
            </div>
            <button onClick={handleCapture} style={{ fontSize: 11, marginTop: 4 }}>
              Capture Frame from Scene
            </button>
            <div style={{ fontSize: 10, color: '#6c7086' }}>
              Paint changes on the scene, then click to capture
            </div>
          </div>
        </div>

        {/* Phase list */}
        {phases.map((phase, pi) => (
          <div
            key={pi}
            style={{
              border: pi === activePhaseIdx ? '1px solid #89b4fa' : '1px solid #313244',
              borderRadius: 6, padding: 8,
              background: pi === activePhaseIdx ? 'rgba(137,180,250,0.05)' : 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => setActivePhaseIdx(pi)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Phase {pi + 1}</span>
              <span style={{ fontSize: 11, color: '#6c7086' }}>
                {phase.frames.length} frame{phase.frames.length !== 1 ? 's' : ''}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11 }}>Speed:</span>
                <input
                  type="range" min={1} max={12} value={phase.speed}
                  onChange={(e) => updatePhase(pi, { speed: Number(e.target.value) })}
                  style={{ width: 60 }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{ fontSize: 11, minWidth: 28 }}>{phase.speed}fps</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={phase.loops === undefined}
                  onChange={(e) => updatePhase(pi, { loops: e.target.checked ? undefined : 1 })}
                  onClick={(e) => e.stopPropagation()}
                />
                Infinite
              </label>
              {phase.loops !== undefined && (
                <>
                  <input
                    type="number" min={1} max={999} value={phase.loops}
                    onChange={(e) => updatePhase(pi, { loops: Math.max(1, Number(e.target.value)) })}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: 50, background: '#313244', color: '#cdd6f4',
                      border: '1px solid #45475a', borderRadius: 3, padding: '1px 4px', fontSize: 11,
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#a6adc8' }}>loops</span>
                </>
              )}
              {phases.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); removePhase(pi); }}
                  style={{ marginLeft: 'auto', fontSize: 10, color: '#f38ba8', padding: '1px 6px' }}
                >
                  Remove
                </button>
              )}
            </div>

            {/* Frame thumbnails */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {phase.frames.map((frame, fi) => (
                <FrameThumb
                  key={fi}
                  frame={frame.tiles}
                  width={gw}
                  height={gh}
                  tileSize={tileSize}
                  tileset={tileset}
                  onClick={() => removeFrame(pi, fi)}
                  label={`F${fi + 1}`}
                />
              ))}
            </div>
          </div>
        ))}

        <button onClick={addPhase} style={{ fontSize: 11 }}>
          + Add Phase
        </button>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={handleRemove} style={{ color: '#f38ba8' }}>Delete</button>
          <button onClick={onClose}>Cancel</button>
          <button className="active" onClick={handleSave} disabled={totalFrames < 1}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function FrameThumb({
  frame, width, height, tileSize, tileset, onClick, label,
}: {
  frame: number[];
  width: number;
  height: number;
  tileSize: number;
  tileset: { tileImages: ImageBitmap[] } | null;
  onClick: () => void;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tileset) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sz = 48;
    const cellW = sz / width;
    const cellH = (sz * height) / width / height;
    canvas.width = sz;
    canvas.height = Math.round(sz * height / width);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#313244';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const id = frame[y * width + x];
        if (id >= 0 && id < tileset.tileImages.length) {
          ctx.drawImage(tileset.tileImages[id], x * cellW, y * cellH, cellW, cellH);
        }
      }
    }
  }, [frame, width, height, tileSize, tileset]);

  return (
    <div
      style={{
        position: 'relative', cursor: 'pointer',
        border: '1px solid #45475a', borderRadius: 2, overflow: 'hidden',
      }}
      onClick={onClick}
      title="Click to remove"
    >
      <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', display: 'block' }} />
      <span style={{
        position: 'absolute', bottom: 0, right: 1,
        fontSize: 8, color: '#cdd6f4', textShadow: '0 0 2px #000',
      }}>{label}</span>
    </div>
  );
}
