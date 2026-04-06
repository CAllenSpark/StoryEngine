import { useEffect, useCallback } from 'react';
import { useTemporalStore } from './store/temporal.js';
import { Toolbar } from './components/Toolbar.js';
import { TilesetPanel } from './components/TilesetPanel.js';
import { EditorCanvas } from './components/EditorCanvas.js';
import { LayerPanel } from './components/LayerPanel.js';
import { PreviewPane } from './components/PreviewPane.js';
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
      }
    },
    [undo, redo],
  );

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
          <PreviewPane />
        </div>
      </div>
      <ExportBar />
    </div>
  );
}
