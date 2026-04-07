import { useEffect, useCallback } from 'react';
import { useEditorStore } from './store/editorStore.js';
import { useTemporalStore } from './store/temporal.js';
import { Toolbar } from './components/Toolbar.js';
import { TilesetPanel } from './components/TilesetPanel.js';
import { EditorCanvas } from './components/EditorCanvas.js';
import { LayerPanel } from './components/LayerPanel.js';
import { TilesetLibrary } from './components/TilesetLibrary.js';
import { CollectionPanel } from './components/CollectionPanel.js';
import { PrefabPanel } from './components/PrefabPanel.js';
import { ExportBar } from './components/ExportBar.js';
import './App.css';

export function App() {
  const { undo, redo } = useTemporalStore();

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
      }
    },
    [undo, redo],
  );

  useEffect(() => {
    useEditorStore.getState().restoreTileset();
    useEditorStore.getState().loadLibrary();
    useEditorStore.getState().restoreCollection();
    useEditorStore.getState().loadPrefabLibrary();
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="app">
      <Toolbar />
      <div className="editor-layout">
        <TilesetPanel />
        <EditorCanvas />
        <div className="right-panel">
          <LayerPanel />
          <CollectionPanel />
          <PrefabPanel />
          <TilesetLibrary />
        </div>
      </div>
      <ExportBar />
    </div>
  );
}
