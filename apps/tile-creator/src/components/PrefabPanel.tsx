import { useState } from 'react';
import { useEditorStore } from '../store/editorStore.js';

export function PrefabPanel() {
  const prefabLibrary = useEditorStore((s) => s.prefabLibrary);
  const clipboard = useEditorStore((s) => s.clipboard);
  const loadPrefab = useEditorStore((s) => s.loadPrefab);
  const deletePrefab = useEditorStore((s) => s.deletePrefab);
  const savePrefabFromClipboard = useEditorStore((s) => s.savePrefabFromClipboard);
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>Prefab Library</span>
      {clipboard && (
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            type="text"
            placeholder="Prefab name..."
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            style={{ flex: 1, fontSize: 11, padding: '2px 4px' }}
          />
          <button
            disabled={!saveName.trim() || isSaving}
            onClick={async () => {
              setIsSaving(true);
              await savePrefabFromClipboard(saveName.trim());
              setSaveName('');
              setIsSaving(false);
            }}
            style={{ fontSize: 10, padding: '2px 6px' }}
          >
            {isSaving ? '...' : 'Save'}
          </button>
        </div>
      )}
      {prefabLibrary.length === 0 ? (
        <span style={{ fontSize: 11, color: '#6c7086' }}>
          No prefabs saved. Select tiles and save as a prefab.
        </span>
      ) : (
        prefabLibrary.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 4px', fontSize: 11, cursor: 'pointer',
              borderRadius: 3, background: '#1e1e2e',
            }}
          >
            <span
              onClick={() => loadPrefab(p.id)}
              style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={`${p.name} (${p.width}x${p.height})`}
            >
              {p.name}
            </span>
            <span style={{ color: '#6c7086', fontSize: 10, flexShrink: 0 }}>
              {p.width}x{p.height}
            </span>
            <button
              onClick={() => deletePrefab(p.id)}
              style={{ fontSize: 10, padding: '0 4px', color: '#f38ba8' }}
            >
              x
            </button>
          </div>
        ))
      )}
    </div>
  );
}
