import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { migrateTileAnimation } from '@storyengine/shared';
import type { AnimationPhase } from '@storyengine/shared';

interface AnimationDialogProps {
  baseTileId: number;
  onClose: () => void;
}

function newPhase(baseTileId: number): AnimationPhase {
  return { frames: [baseTileId], speed: 4 };
}

export function AnimationDialog({ baseTileId, onClose }: AnimationDialogProps) {
  const tileset = useEditorStore((s) => s.tileset);
  const animationLibrary = useEditorStore((s) => s.animationLibrary);
  const existing = tileset?.ref.animations?.[String(baseTileId)];
  const migrated = existing ? migrateTileAnimation(existing) : null;

  const [phases, setPhases] = useState<AnimationPhase[]>(
    migrated?.phases ?? [newPhase(baseTileId)],
  );
  const [libName, setLibName] = useState('');
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [previewFrame, setPreviewFrame] = useState(0);
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);

  const tileSize = tileset?.ref.tileSize ?? 16;

  // Load library on mount
  useEffect(() => {
    useEditorStore.getState().loadAnimationLibrary();
  }, []);

  // Flatten all frames for preview
  const allFrames = phases.flatMap((p) => {
    if (p.loops !== undefined) {
      const repeated: number[] = [];
      for (let i = 0; i < p.loops; i++) repeated.push(...p.frames);
      return repeated;
    }
    return p.frames;
  });

  // Animate preview using the active phase's speed
  useEffect(() => {
    if (allFrames.length < 2) return;
    const activePhase = phases[activePhaseIdx] ?? phases[0];
    const speed = activePhase?.speed ?? 4;
    const interval = setInterval(() => {
      setPreviewFrame((f) => (f + 1) % allFrames.length);
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [allFrames.length, phases, activePhaseIdx]);

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
    const id = allFrames[previewFrame] ?? baseTileId;
    if (id >= 0 && id < tileset.tileImages.length) {
      ctx.drawImage(tileset.tileImages[id], 0, 0, sz, sz);
    }
  }, [tileset, allFrames, previewFrame, baseTileId, tileSize]);

  const updatePhase = (idx: number, patch: Partial<AnimationPhase>) => {
    setPhases((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const addFrameToPhase = (phaseIdx: number, tileId: number) => {
    setPhases((prev) =>
      prev.map((p, i) => (i === phaseIdx ? { ...p, frames: [...p.frames, tileId] } : p)),
    );
  };

  const removeFrameFromPhase = (phaseIdx: number, frameIdx: number) => {
    setPhases((prev) =>
      prev.map((p, i) => (i === phaseIdx ? { ...p, frames: p.frames.filter((_, fi) => fi !== frameIdx) } : p)),
    );
  };

  const addPhase = () => {
    setPhases((prev) => [...prev, newPhase(baseTileId)]);
    setActivePhaseIdx(phases.length);
  };

  const removePhase = (idx: number) => {
    if (phases.length <= 1) return;
    setPhases((prev) => prev.filter((_, i) => i !== idx));
    if (activePhaseIdx >= phases.length - 1) setActivePhaseIdx(Math.max(0, phases.length - 2));
  };

  const totalFrameCount = phases.reduce((sum, p) => sum + p.frames.length, 0);

  const handleSave = () => {
    const validPhases = phases.filter((p) => p.frames.length >= 1);
    if (validPhases.length > 0) {
      useEditorStore.getState().setTileAnimation(baseTileId, validPhases);
    }
    onClose();
  };

  const handleRemove = () => {
    useEditorStore.getState().removeTileAnimation(baseTileId);
    onClose();
  };

  const handleSaveToLibrary = async () => {
    if (!libName.trim()) return;
    await useEditorStore.getState().saveAnimationToLibrary(libName.trim(), phases);
    setLibName('');
  };

  const handleLoadFromLibrary = (animId: string) => {
    const stored = animationLibrary.find((a) => a.id === animId);
    if (stored) {
      setPhases(stored.phases);
      setActivePhaseIdx(0);
    }
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
          borderRadius: 8, padding: 16, maxWidth: 440, width: '100%',
          display: 'flex', flexDirection: 'column', gap: 10,
          maxHeight: '90vh', overflow: 'auto',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          Tile Animation — Tile #{baseTileId}
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <canvas
            ref={previewRef}
            style={{ imageRendering: 'pixelated', border: '1px solid #313244', flexShrink: 0 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, color: '#a6adc8' }}>
              {phases.length} phase{phases.length !== 1 ? 's' : ''}, {totalFrameCount} total frames
            </div>
            <div style={{ fontSize: 11, color: '#a6adc8' }}>
              Click a tile in the palette below to add frames.
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
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

            {/* Loops control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
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
                <input
                  type="number" min={1} max={999} value={phase.loops}
                  onChange={(e) => updatePhase(pi, { loops: Math.max(1, Number(e.target.value)) })}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 50, background: '#313244', color: '#cdd6f4',
                    border: '1px solid #45475a', borderRadius: 3, padding: '1px 4px', fontSize: 11,
                  }}
                />
              )}
              {phase.loops !== undefined && (
                <span style={{ fontSize: 11, color: '#a6adc8' }}>
                  loop{phase.loops !== 1 ? 's' : ''}
                </span>
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

            {/* Frame tiles */}
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {phase.frames.map((fId, fi) => (
                <div
                  key={fi}
                  style={{
                    width: 28, height: 28, position: 'relative',
                    border: '1px solid #45475a', borderRadius: 2,
                    overflow: 'hidden', cursor: 'pointer',
                  }}
                  onClick={(e) => { e.stopPropagation(); removeFrameFromPhase(pi, fi); }}
                  title={`Tile #${fId} — click to remove`}
                >
                  {tileset && fId < tileset.tileImages.length && (
                    <FrameThumb tileset={tileset} tileId={fId} />
                  )}
                  <span style={{
                    position: 'absolute', bottom: 0, right: 1,
                    fontSize: 7, color: '#cdd6f4', textShadow: '0 0 2px #000',
                  }}>{fId}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button onClick={addPhase} style={{ fontSize: 11 }}>
          + Add Phase
        </button>

        {/* Tile picker for active phase */}
        {tileset && (
          <>
            <div style={{ fontSize: 11, color: '#6c7086' }}>
              Click tiles to add to Phase {activePhaseIdx + 1}:
            </div>
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxHeight: 80, overflow: 'auto' }}>
              {tileset.tileImages.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 22, height: 22, border: '1px solid #313244',
                    borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
                  }}
                  onClick={() => addFrameToPhase(activePhaseIdx, i)}
                  title={`Tile #${i}`}
                >
                  <FrameThumb tileset={tileset} tileId={i} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Library section */}
        <div style={{ borderTop: '1px solid #313244', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Animation Library</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              placeholder="Animation name..."
              value={libName}
              onChange={(e) => setLibName(e.target.value)}
              style={{
                flex: 1, background: '#313244', color: '#cdd6f4',
                border: '1px solid #45475a', borderRadius: 4,
                padding: '2px 6px', fontSize: 11,
              }}
            />
            <button onClick={handleSaveToLibrary} disabled={!libName.trim()} style={{ fontSize: 11 }}>
              Save
            </button>
          </div>
          {animationLibrary.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {animationLibrary.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <button
                    onClick={() => handleLoadFromLibrary(a.id)}
                    style={{ fontSize: 10, padding: '1px 6px' }}
                    title={`${a.phases.length} phase(s)`}
                  >
                    {a.name}
                  </button>
                  <button
                    onClick={() => useEditorStore.getState().deleteAnimationFromLibrary(a.id)}
                    style={{ fontSize: 9, color: '#f38ba8', padding: '0 3px' }}
                    title="Delete"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {existing && (
            <button onClick={handleRemove} style={{ color: '#f38ba8' }}>
              Remove Animation
            </button>
          )}
          <button onClick={onClose}>Cancel</button>
          <button className="active" onClick={handleSave} disabled={totalFrameCount < 2}>
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
