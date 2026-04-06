import { useState, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore.js';

export function LayerPanel() {
  const layers = useEditorStore((s) => s.scene.layers);
  const activeLayerIndex = useEditorStore((s) => s.activeLayerIndex);
  const layerVisibility = useEditorStore((s) => s.layerVisibility);
  const setActiveLayer = useEditorStore((s) => s.setActiveLayer);
  const toggleLayerVisibility = useEditorStore((s) => s.toggleLayerVisibility);
  const addLayer = useEditorStore((s) => s.addLayer);
  const removeLayer = useEditorStore((s) => s.removeLayer);
  const moveLayer = useEditorStore((s) => s.moveLayer);
  const renameLayer = useEditorStore((s) => s.renameLayer);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const handleAddLayer = useCallback(() => {
    addLayer(`Layer ${layers.length + 1}`);
  }, [addLayer, layers.length]);

  const startRename = useCallback(
    (index: number) => {
      setEditingIndex(index);
      setEditName(layers[index].name);
    },
    [layers],
  );

  const commitRename = useCallback(() => {
    if (editingIndex !== null && editName.trim()) {
      renameLayer(editingIndex, editName.trim());
    }
    setEditingIndex(null);
  }, [editingIndex, editName, renameLayer]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 8,
        gap: 4,
        overflow: 'auto',
        borderBottom: '1px solid #313244',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
        Layers
      </div>
      {layers.map((layer: { name: string; data: number[] }, i: number) => (
        <div
          key={i}
          onClick={() => setActiveLayer(i)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 4px',
            borderRadius: 3,
            background: i === activeLayerIndex ? '#313244' : 'transparent',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLayerVisibility(i);
            }}
            style={{
              width: 20,
              padding: 0,
              fontSize: 10,
              opacity: layerVisibility[i] ? 1 : 0.4,
            }}
          >
            {layerVisibility[i] ? 'V' : 'H'}
          </button>
          {editingIndex === i ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === 'Enter' && commitRename()}
              autoFocus
              style={{
                flex: 1,
                background: '#1e1e2e',
                color: '#cdd6f4',
                border: '1px solid #89b4fa',
                borderRadius: 2,
                padding: '0 2px',
                fontSize: 12,
              }}
            />
          ) : (
            <span
              onDoubleClick={() => startRename(i)}
              style={{ flex: 1, userSelect: 'none' }}
            >
              {layer.name}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveLayer(i, i - 1);
            }}
            disabled={i === 0}
            style={{ width: 20, padding: 0, fontSize: 10 }}
          >
            ^
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveLayer(i, i + 1);
            }}
            disabled={i === layers.length - 1}
            style={{ width: 20, padding: 0, fontSize: 10 }}
          >
            v
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeLayer(i);
            }}
            disabled={layers.length <= 1}
            style={{ width: 20, padding: 0, fontSize: 10, color: '#f38ba8' }}
          >
            x
          </button>
        </div>
      ))}
      <button onClick={handleAddLayer} style={{ marginTop: 4 }}>
        + Add Layer
      </button>
    </div>
  );
}
