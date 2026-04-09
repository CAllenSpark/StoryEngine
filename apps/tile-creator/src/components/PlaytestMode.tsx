import { useRef, useState, useCallback, useEffect, useMemo, type CSSProperties } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { usePlaytest, type PlaytestState, type MediaOverlay } from '../hooks/usePlaytest.js';

const mediaOverlayStyle: CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 12,
  background: 'rgba(0, 0, 0, 0.75)', zIndex: 5,
};

const mediaPlaceholderStyle: CSSProperties = {
  background: 'rgba(30, 30, 46, 0.95)', border: '2px solid #45475a',
  borderRadius: 8, padding: '40px 60px',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  color: '#cdd6f4',
};

const mediaDismissHint: CSSProperties = {
  fontSize: 10, color: '#6c7086',
};

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

      {/* Media overlay — video */}
      {state?.media?.type === 'video' && (
        <div style={mediaOverlayStyle}>
          {state.media.url ? (
            <video
              src={state.media.url}
              autoPlay
              controls
              style={{ maxWidth: '80vw', maxHeight: '70vh', borderRadius: 8 }}
              onEnded={() => useEditorStore.getState() /* dismiss handled by interact */}
            />
          ) : (
            <div style={mediaPlaceholderStyle}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Video Player</span>
              <span style={{ fontSize: 12, color: '#6c7086' }}>No URL configured</span>
            </div>
          )}
          <span style={mediaDismissHint}>Press Space/Enter to dismiss</span>
        </div>
      )}

      {/* Media overlay — image */}
      {state?.media?.type === 'image' && (
        <div style={mediaOverlayStyle}>
          {state.media.url ? (
            <img
              src={state.media.url}
              alt="Action image"
              style={{ maxWidth: '80vw', maxHeight: '70vh', borderRadius: 8, objectFit: 'contain' }}
            />
          ) : (
            <div style={mediaPlaceholderStyle}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Image Display</span>
              <span style={{ fontSize: 12, color: '#6c7086' }}>No URL configured</span>
            </div>
          )}
          <span style={mediaDismissHint}>Press Space/Enter to dismiss</span>
        </div>
      )}

      {/* Media overlay — slideshow */}
      {state?.media?.type === 'slideshow' && (
        <div style={mediaOverlayStyle}>
          <SlideshowOverlay media={state.media} />
          <span style={mediaDismissHint}>Press Space/Enter to dismiss</span>
        </div>
      )}

      {/* Media overlay — player input */}
      {state?.media?.type === 'playerInput' && (
        <div style={mediaOverlayStyle}>
          <div style={{
            background: 'rgba(30, 30, 46, 0.95)', border: '2px solid #cba6f7',
            borderRadius: 8, padding: '16px 24px', maxWidth: 400,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#cba6f7' }}>
              {state.media.prompt ?? 'What do you do?'}
            </span>
            {(state.media.options ?? []).map((opt, i) => (
              <div key={i} style={{
                fontSize: 13, color: '#cdd6f4', padding: '4px 8px',
                background: 'rgba(203, 166, 247, 0.1)', borderRadius: 4,
              }}>
                <span style={{ color: '#cba6f7', fontWeight: 600, marginRight: 8 }}>{i + 1}.</span>
                {opt}
              </div>
            ))}
            <span style={{ fontSize: 10, color: '#6c7086' }}>
              Press 1-{(state.media.options ?? []).length} to choose, or Space to dismiss
            </span>
          </div>
        </div>
      )}

      {/* Audio indicator */}
      {state?.audio && (
        <div style={{
          position: 'absolute', top: 40, right: 12,
          fontSize: 10, color: '#89b4fa', background: 'rgba(30,30,46,0.8)',
          padding: '2px 8px', borderRadius: 4,
        }}>
          Audio: {state.audio.url ? state.audio.url.split('/').pop() : 'playing'}
          {state.audio.loop && ' (loop)'}
        </div>
      )}

      {/* Controls help */}
      {state?.running && !state.dialogue && !state.media && (
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

function SlideshowOverlay({ media }: { media: MediaOverlay }) {
  const [index, setIndex] = useState(0);
  const urls = media.urls ?? [];
  const interval = media.interval ?? 2000;

  useEffect(() => {
    if (urls.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % urls.length);
    }, interval);
    return () => clearInterval(timer);
  }, [urls.length, interval]);

  if (urls.length === 0) {
    return (
      <div style={mediaPlaceholderStyle}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Slideshow</span>
        <span style={{ fontSize: 12, color: '#6c7086' }}>No images configured</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <img
        src={urls[index]}
        alt={`Slide ${index + 1}`}
        style={{ maxWidth: '80vw', maxHeight: '65vh', borderRadius: 8, objectFit: 'contain' }}
      />
      <span style={{ fontSize: 11, color: '#6c7086' }}>
        {index + 1}/{urls.length}
      </span>
    </div>
  );
}
