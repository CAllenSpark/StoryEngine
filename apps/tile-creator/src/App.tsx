import { useEffect, useCallback, useState } from 'react';
import { useEditorStore } from './store/editorStore.js';
import { useTemporalStore } from './store/temporal.js';
import { useAutosave, formatTimeSince } from './hooks/useAutosave.js';
import { Toolbar } from './components/Toolbar.js';
import { GameToolbar } from './components/GameToolbar.js';
import { TilesetPanel } from './components/TilesetPanel.js';
import { EditorCanvas } from './components/EditorCanvas.js';
import { LayerPanel } from './components/LayerPanel.js';
import { TilesetLibrary } from './components/TilesetLibrary.js';
import { CollectionPanel } from './components/CollectionPanel.js';
import { PrefabPanel } from './components/PrefabPanel.js';
import { EntityPanel } from './components/EntityPanel.js';
import { SpriteLibraryPanel } from './components/SpriteLibraryPanel.js';
import { ExportBar } from './components/ExportBar.js';
import './App.css';

export function App() {
  const { undo, redo } = useTemporalStore();
  const editorMode = useEditorStore((s) => s.editorMode);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const { status: saveStatus, lastSavedAt } = useAutosave();
  const [, forceUpdate] = useState(0);

  // Re-render the "Xs ago" text periodically
  useEffect(() => {
    if (!lastSavedAt) return;
    const interval = setInterval(() => forceUpdate((n) => n + 1), 10000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey
      ) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const { currentRotation, setRotation } = useEditorStore.getState();
        setRotation((currentRotation + 1) % 4);
      } else if (e.key === 'Escape') {
        const { selectionBounds, clipboard } = useEditorStore.getState();
        if (selectionBounds || clipboard) {
          useEditorStore.getState().clearSelection();
        }
      } else if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        useEditorStore.getState().setActiveTool('select');
      } else if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        useEditorStore.getState().setActiveTool('colorPaint');
      } else if (e.key === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        useEditorStore.getState().toggleFlipH();
      } else if (e.key === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        useEditorStore.getState().toggleFlipV();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const mode = useEditorStore.getState().editorMode;
        useEditorStore.getState().setEditorMode(mode === 'art' ? 'game' : 'art');
      }
    },
    [undo, redo],
  );

  useEffect(() => {
    (async () => {
      await useEditorStore.getState().restoreTileset();
      await useEditorStore.getState().loadLibrary();
      await useEditorStore.getState().restoreCollection();
      await useEditorStore.getState().loadPrefabLibrary();
      await useEditorStore.getState().loadSpriteSheetLibrary();
      // First-run experience: if no collection was restored, auto-load the
      // Lighthouse sample so creators see a working reference instead of
      // a blank canvas.
      if (!useEditorStore.getState().currentCollection) {
        try {
          await useEditorStore.getState().loadLighthouseSample();
        } catch (err) {
          console.warn('Failed to load Lighthouse sample', err);
        }
      }
    })();
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="app">
      {/* Mode switcher */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid #313244', background: '#11111b',
      }}>
        <button
          className={editorMode === 'art' ? 'active' : ''}
          onClick={() => setEditorMode('art')}
          style={{ borderRadius: 0, borderBottom: editorMode === 'art' ? '2px solid #89b4fa' : '2px solid transparent' }}
        >
          Art Mode
        </button>
        <button
          className={editorMode === 'game' ? 'active' : ''}
          onClick={() => setEditorMode('game')}
          style={{ borderRadius: 0, borderBottom: editorMode === 'game' ? '2px solid #a6e3a1' : '2px solid transparent' }}
        >
          Game Mode
        </button>
        <span style={{ marginLeft: 8, fontSize: 10, color: '#6c7086' }}>Tab to switch</span>
        <span style={{
          marginLeft: 'auto', marginRight: 8,
          fontSize: 10, padding: '1px 8px', borderRadius: 4,
          background: saveStatus === 'error' ? 'rgba(243,139,168,0.2)' : 'rgba(166,227,161,0.1)',
          color: saveStatus === 'unsaved' ? '#f9e2af'
            : saveStatus === 'saving' ? '#89b4fa'
            : saveStatus === 'error' ? '#f38ba8'
            : saveStatus === 'saved' ? '#a6e3a1'
            : '#6c7086',
        }}>
          {saveStatus === 'unsaved' && 'Unsaved changes'}
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'error' && 'Save failed'}
          {saveStatus === 'saved' && `Saved ${formatTimeSince(lastSavedAt) ?? ''}`}
          {saveStatus === 'idle' && (lastSavedAt ? `Saved ${formatTimeSince(lastSavedAt) ?? ''}` : '')}
        </span>
      </div>

      {editorMode === 'art' ? <Toolbar /> : <GameToolbar />}
      <div className="editor-layout">
        {editorMode === 'art' && <TilesetPanel />}
        <EditorCanvas />
        <div className="right-panel">
          {editorMode === 'art' && <LayerPanel />}
          <CollectionPanel />
          {editorMode === 'art' && <PrefabPanel />}
          {editorMode === 'game' && <EntityPanel />}
          <SpriteLibraryPanel />
          <TilesetLibrary />
        </div>
      </div>
      <ExportBar />
    </div>
  );
}
