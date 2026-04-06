import { useEditorStore } from '../store/editorStore.js';
import type { Tool } from '../types/editor.js';

export function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const zoom = useEditorStore((s) => s.zoom);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setZoom = useEditorStore((s) => s.setZoom);

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
      <span style={{ fontSize: 14, fontWeight: 600, marginRight: 8 }}>
        Tile Creator
      </span>
      {(['paint', 'erase'] as Tool[]).map((tool) => (
        <button
          key={tool}
          className={activeTool === tool ? 'active' : ''}
          onClick={() => setActiveTool(tool)}
        >
          {tool === 'paint' ? 'Paint' : 'Erase'}
        </button>
      ))}
      <span style={{ marginLeft: 'auto', fontSize: 12 }}>Zoom:</span>
      <button onClick={() => setZoom(zoom - 1)}>-</button>
      <span style={{ fontSize: 12, minWidth: 24, textAlign: 'center' }}>
        {zoom}x
      </span>
      <button onClick={() => setZoom(zoom + 1)}>+</button>
    </div>
  );
}
