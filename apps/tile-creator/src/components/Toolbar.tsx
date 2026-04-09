import { useState } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { AnimationDialog } from './AnimationDialog.js';
import { GroupAnimationDialog } from './GroupAnimationDialog.js';
import type { Tool } from '../types/editor.js';

const TOOL_LABELS: Record<Tool, string> = {
  paint: 'Paint',
  erase: 'Erase',
  select: 'Select',
  colorPaint: 'Color',
};

export function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const zoom = useEditorStore((s) => s.zoom);
  const currentRotation = useEditorStore((s) => s.currentRotation);
  const currentFlipH = useEditorStore((s) => s.currentFlipH);
  const currentFlipV = useEditorStore((s) => s.currentFlipV);
  const currentColor = useEditorStore((s) => s.currentColor);
  const selectedTileId = useEditorStore((s) => s.selectedTileId);
  const tileset = useEditorStore((s) => s.tileset);
  const hasSelection = useEditorStore((s) => s.selectionBounds !== null || s.clipboard !== null);
  const brushStamp = useEditorStore((s) => s.brushStamp);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setRotation = useEditorStore((s) => s.setRotation);
  const toggleFlipH = useEditorStore((s) => s.toggleFlipH);
  const toggleFlipV = useEditorStore((s) => s.toggleFlipV);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const setColor = useEditorStore((s) => s.setColor);
  const [showAnimDialog, setShowAnimDialog] = useState(false);
  const [groupAnimId, setGroupAnimId] = useState<string | null>(null);
  const selectionBounds = useEditorStore((s) => s.selectionBounds);

  const paintDisabled = activeTool === 'paint' && (selectedTileId < 0 || !tileset);
  const canAnimate = selectionBounds !== null || (selectedTileId >= 0 && !!tileset);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        borderBottom: '1px solid #313244',
        background: '#181825',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, marginRight: 4 }}>
        Tile Creator
      </span>
      <span style={{ fontSize: 12, color: '#6c7086', marginRight: 8 }}>Art</span>
      {(['paint', 'erase', 'select', 'colorPaint'] as Tool[]).map((tool) => (
        <button
          key={tool}
          className={activeTool === tool ? 'active' : ''}
          onClick={() => {
            if (tool === 'erase' && hasSelection) {
              useEditorStore.getState().eraseSelection();
            } else {
              setActiveTool(tool);
            }
          }}
        >
          {TOOL_LABELS[tool]}
        </button>
      ))}
      {activeTool === 'colorPaint' && (
        <input
          type="color"
          value={currentColor}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 28, height: 24, padding: 0, border: '1px solid #45475a', cursor: 'pointer' }}
        />
      )}
      {brushStamp && activeTool === 'paint' && (
        <span style={{ fontSize: 11, color: '#f9e2af', display: 'flex', alignItems: 'center', gap: 4 }}>
          Brush: {brushStamp.width}x{brushStamp.height}
          <button
            onClick={() => useEditorStore.getState().setBrushStamp(null)}
            style={{ fontSize: 9, color: '#f38ba8', padding: '0 4px' }}
          >clear</button>
        </span>
      )}
      {paintDisabled && !brushStamp && (
        <span style={{ fontSize: 11, color: '#f9e2af' }}>Select a tile first</span>
      )}
      {hasSelection && (
        <button onClick={clearSelection} style={{ color: '#f38ba8' }}>
          Clear
        </button>
      )}
      <span style={{ marginLeft: 8, fontSize: 12, color: '#6c7086' }}>|</span>
      <button
        disabled={!canAnimate}
        onClick={() => {
          if (selectionBounds) {
            const id = useEditorStore.getState().addGroupAnimation('Group Animation');
            if (id) setGroupAnimId(id);
          } else {
            setShowAnimDialog(true);
          }
        }}
      >
        Animate{selectionBounds ? ' Group' : ''}
      </button>
      <button onClick={() => setRotation((currentRotation + 1) % 4)}>
        Rotate: {currentRotation * 90}&deg;
      </button>
      <button className={currentFlipH ? 'active' : ''} onClick={toggleFlipH}>
        Flip H
      </button>
      <button className={currentFlipV ? 'active' : ''} onClick={toggleFlipV}>
        Flip V
      </button>
      <span style={{ marginLeft: 'auto', fontSize: 12 }}>Zoom:</span>
      <button onClick={() => setZoom(zoom - 1)}>-</button>
      <span style={{ fontSize: 12, minWidth: 24, textAlign: 'center' }}>
        {zoom}x
      </span>
      <button onClick={() => setZoom(zoom + 1)}>+</button>
      {showAnimDialog && selectedTileId >= 0 && (
        <AnimationDialog
          baseTileId={selectedTileId}
          onClose={() => setShowAnimDialog(false)}
        />
      )}
      {groupAnimId && (
        <GroupAnimationDialog
          groupId={groupAnimId}
          onClose={() => setGroupAnimId(null)}
        />
      )}
    </div>
  );
}
