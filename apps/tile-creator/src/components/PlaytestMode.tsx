import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { usePlaytest, type PlaytestState } from '../hooks/usePlaytest.js';

interface PlaytestModeProps {
  onClose: () => void;
}

export function PlaytestMode({ onClose }: PlaytestModeProps) {
  const collection = useEditorStore((s) => s.currentCollection);
  const scene = useEditorStore((s) => s.scene);
  const currentSceneId = useEditorStore((s) => s.currentSceneId);
  const tileset = useEditorStore((s) => s.tileset);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<PlaytestState | null>(null);

  // Snapshot collection with live scene edits synced in
  const snapshotCollection = useMemo(() => {
    if (!collection) return { scenes: [] };
    return {
      scenes: collection.scenes.map((entry) =>
        entry.id === currentSceneId ? { ...entry, scene } : entry,
      ),
    };
  }, [collection, scene, currentSceneId]);

  const onStateChange = useCallback((s: PlaytestState) => {
    setState({ ...s });
  }, []);

  const { start, stop } = usePlaytest({
    collection: snapshotCollection,
    tileImages: tileset?.tileImages ?? [],
    canvasRef,
    onStateChange,
    scale: 3,
  });

  // Block editor keyboard shortcuts while playtest is active
  useEffect(() => {
    const blockDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stop();
        onClose();
        return;
      }
      // Allow browser shortcuts (Ctrl/Cmd combos)
      if (e.ctrlKey || e.metaKey) return;
      // Prevent default browser behavior (arrow scroll, Tab focus switch)
      e.preventDefault();
      // Only stop propagation for Tab (would switch editor mode)
      // Let everything else propagate so InputManager receives WASD/arrows/Space
      if (e.key === 'Tab') e.stopPropagation();
    };
    const blockUp = (e: KeyboardEvent) => {
      // Prevent default on keyup too (some browsers need this for arrows)
      if (!e.ctrlKey && !e.metaKey) e.preventDefault();
    };
    window.addEventListener('keydown', blockDown, true);
    window.addEventListener('keyup', blockUp, true);
    return () => {
      window.removeEventListener('keydown', blockDown, true);
      window.removeEventListener('keyup', blockUp, true);
    };
  }, []);

  const sceneName = collection?.scenes.find((s) => s.id === state?.sceneId)?.name;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: '#0e0e1a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '6px 12px', background: 'rgba(30,30,46,0.9)',
          borderBottom: '1px solid #313244', zIndex: 1,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600 }}>Playtest</span>
        {state?.running ? (
          <>
            <span style={{ fontSize: 11, color: '#a6e3a1' }}>Playing</span>
            {sceneName && (
              <span style={{ fontSize: 11, color: '#6c7086' }}>Scene: {sceneName}</span>
            )}
            <button onClick={stop} style={{ fontSize: 11 }}>Stop</button>
          </>
        ) : (
          <>
            <button
              className="active"
              onClick={start}
              disabled={!collection || collection.scenes.length === 0}
              style={{ fontSize: 11 }}
            >
              Start
            </button>
            {(!collection || collection.scenes.length === 0) && (
              <span style={{ fontSize: 11, color: '#f38ba8' }}>
                Need a collection with at least one scene
              </span>
            )}
          </>
        )}
        <button
          onClick={() => { stop(); onClose(); }}
          style={{ marginLeft: 'auto', fontSize: 11, color: '#f38ba8' }}
        >
          Exit Playtest
        </button>
      </div>

      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        style={{
          imageRendering: 'pixelated',
          maxWidth: '95vw',
          maxHeight: 'calc(95vh - 80px)',
        }}
      />

      {/* Dialogue overlay */}
      {state?.dialogue && state.dialogue.length > 0 && (
        <div
          style={{
            position: 'absolute', bottom: 60, left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(30, 30, 46, 0.95)',
            border: '2px solid #89b4fa',
            borderRadius: 8, padding: '12px 20px',
            maxWidth: 500, width: '90%',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: '#89b4fa' }}>
            {state.dialogue[state.dialogueIndex]?.speaker || '???'}
          </span>
          <span style={{ fontSize: 13, color: '#cdd6f4', lineHeight: 1.4 }}>
            {state.dialogue[state.dialogueIndex]?.text}
          </span>
          <span style={{ fontSize: 10, color: '#6c7086', alignSelf: 'flex-end' }}>
            {state.dialogueIndex + 1}/{state.dialogue.length} — Press Space/Enter to continue
          </span>
        </div>
      )}

      {/* Controls help */}
      {state?.running && !state.dialogue && (
        <div
          style={{
            position: 'absolute', bottom: 10, left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 10, color: '#6c7086',
          }}
        >
          WASD/Arrows: Move | Space/Enter/E: Interact
        </div>
      )}

      {/* Start screen */}
      {!state?.running && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700, color: '#cdd6f4' }}>
            Playtest Mode
          </span>
          <span style={{ fontSize: 12, color: '#6c7086', textAlign: 'center', maxWidth: 300 }}>
            Walk through your scene collection as a player.
            Test collisions, exits, NPC dialogue, and action triggers.
          </span>
          <button
            className="active"
            onClick={start}
            disabled={!collection || collection.scenes.length === 0}
            style={{ fontSize: 13, padding: '6px 20px' }}
          >
            Start Playtest
          </button>
          {(!collection || collection.scenes.length === 0) && (
            <span style={{ fontSize: 11, color: '#f38ba8' }}>
              Create a collection with scenes first
            </span>
          )}
        </div>
      )}
    </div>
  );
}
