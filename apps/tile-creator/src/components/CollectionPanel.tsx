import { useState, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore.js';

export function CollectionPanel() {
  const collection = useEditorStore((s) => s.currentCollection);
  const currentSceneId = useEditorStore((s) => s.currentSceneId);
  const createCollection = useEditorStore((s) => s.createCollection);
  const addSceneToCollection = useEditorStore((s) => s.addSceneToCollection);
  const switchScene = useEditorStore((s) => s.switchScene);
  const renameScene = useEditorStore((s) => s.renameScene);
  const deleteScene = useEditorStore((s) => s.deleteScene);
  const saveCollectionToDb = useEditorStore((s) => s.saveCollectionToDb);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [collName, setCollName] = useState('');
  const [editingCollName, setEditingCollName] = useState(false);

  const handleCreate = useCallback(() => {
    const name = collName.trim() || 'Untitled Collection';
    createCollection(name);
    setCollName('');
  }, [collName, createCollection]);

  const startRename = useCallback((id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editName.trim()) {
      renameScene(editingId, editName.trim());
    }
    setEditingId(null);
  }, [editingId, editName, renameScene]);

  if (!collection) {
    return (
      <div
        style={{
          padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
          borderBottom: '1px solid #313244',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600 }}>Collection</div>
        <input
          type="text"
          placeholder="Collection name..."
          value={collName}
          onChange={(e) => setCollName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          style={{
            background: '#313244', color: '#cdd6f4', border: '1px solid #45475a',
            borderRadius: 4, padding: '3px 6px', fontSize: 12,
          }}
        />
        <button onClick={handleCreate}>New Collection</button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', padding: 8, gap: 4,
        borderBottom: '1px solid #313244', overflow: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {editingCollName ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => {
              if (editName.trim()) {
                useEditorStore.setState({
                  currentCollection: { ...collection, name: editName.trim() },
                });
              }
              setEditingCollName(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            autoFocus
            style={{
              flex: 1, background: '#1e1e2e', color: '#cdd6f4',
              border: '1px solid #89b4fa', borderRadius: 2, padding: '0 4px', fontSize: 12,
            }}
          />
        ) : (
          <span
            onDoubleClick={() => {
              setEditingCollName(true);
              setEditName(collection.name);
            }}
            style={{ fontSize: 12, fontWeight: 600, flex: 1, cursor: 'pointer' }}
          >
            {collection.name}
          </span>
        )}
        <button onClick={() => saveCollectionToDb()} style={{ fontSize: 10, padding: '2px 6px' }}>
          Save
        </button>
      </div>
      {collection.scenes.map((entry) => (
        <div
          key={entry.id}
          onClick={() => switchScene(entry.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px',
            borderRadius: 3, cursor: 'pointer', fontSize: 11,
            background: entry.id === currentSceneId ? '#313244' : 'transparent',
          }}
        >
          {editingId === entry.id ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === 'Enter' && commitRename()}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1, background: '#1e1e2e', color: '#cdd6f4',
                border: '1px solid #89b4fa', borderRadius: 2, padding: '0 2px', fontSize: 11,
              }}
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename(entry.id, entry.name);
              }}
              style={{ flex: 1, userSelect: 'none' }}
            >
              {entry.name}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteScene(entry.id);
            }}
            disabled={collection.scenes.length <= 1}
            style={{ width: 18, height: 18, padding: 0, fontSize: 10, color: '#f38ba8' }}
          >
            x
          </button>
        </div>
      ))}
      <button
        onClick={() => addSceneToCollection(`Scene ${collection.scenes.length + 1}`)}
        style={{ fontSize: 11 }}
      >
        + Add Scene
      </button>
    </div>
  );
}
