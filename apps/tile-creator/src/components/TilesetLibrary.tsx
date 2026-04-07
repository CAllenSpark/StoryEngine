import { useState } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import type { StoredTileset } from '../lib/assetDb.js';

export function TilesetLibrary() {
  const library = useEditorStore((s) => s.tilesetLibrary);
  const currentTilesetId = useEditorStore((s) => s.currentTilesetId);
  const switchTileset = useEditorStore((s) => s.switchTileset);
  const mergeFromLibrary = useEditorStore((s) => s.mergeFromLibrary);
  const deleteTilesetFromLibrary = useEditorStore((s) => s.deleteTilesetFromLibrary);
  const saveTilesetToLibrary = useEditorStore((s) => s.saveTilesetToLibrary);
  const tileset = useEditorStore((s) => s.tileset);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameFolder, setRenameFolder] = useState('');

  // Group tilesets by folder
  const grouped = new Map<string, StoredTileset[]>();
  for (const ts of library) {
    const folder = ts.folder || '';
    if (!grouped.has(folder)) grouped.set(folder, []);
    grouped.get(folder)!.push(ts);
  }
  const folders = [...grouped.keys()].sort((a, b) => {
    if (a === '') return 1;
    if (b === '') return -1;
    return a.localeCompare(b);
  });

  const toggleFolder = (folder: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const handleAssignFolder = async (tsId: string, folder: string) => {
    try {
      const { loadTilesetById, saveTilesetToLibrary: saveTs } = await import('../lib/assetDb.js');
      const stored = await loadTilesetById(tsId);
      if (stored) {
        stored.folder = folder || undefined;
        await saveTs(stored);
        await useEditorStore.getState().loadLibrary();
      }
    } catch {
      // silently fail
    }
    setRenamingId(null);
  };

  const renderTileset = (ts: StoredTileset) => (
    <div
      key={ts.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 4px',
        borderRadius: 3,
        background: ts.id === currentTilesetId ? '#313244' : 'transparent',
        cursor: 'pointer',
        fontSize: 11,
      }}
      onClick={() => switchTileset(ts.id)}
    >
      <div
        style={{
          width: 20, height: 20,
          background: '#45475a', borderRadius: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: '#6c7086',
        }}
      >
        {ts.tileSize}
      </div>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {ts.name}
      </span>
      {renamingId === ts.id ? (
        <form
          onSubmit={(e) => { e.preventDefault(); handleAssignFolder(ts.id, renameFolder); }}
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', gap: 2 }}
        >
          <input
            type="text"
            placeholder="folder name"
            value={renameFolder}
            onChange={(e) => setRenameFolder(e.target.value)}
            autoFocus
            style={{
              width: 60, background: '#313244', color: '#cdd6f4',
              border: '1px solid #45475a', borderRadius: 3,
              padding: '0 3px', fontSize: 10,
            }}
            onBlur={() => setRenamingId(null)}
            onKeyDown={(e) => e.key === 'Escape' && setRenamingId(null)}
          />
        </form>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            mergeFromLibrary(ts.id);
          }}
          style={{ width: 18, height: 18, padding: 0, fontSize: 9, flexShrink: 0 }}
          title="Merge into current tileset"
        >
          +
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRenamingId(ts.id);
            setRenameFolder(ts.folder || '');
          }}
          style={{ width: 18, height: 18, padding: 0, fontSize: 9, flexShrink: 0 }}
          title="Assign folder"
        >
          f
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteTilesetFromLibrary(ts.id);
        }}
        style={{ width: 18, height: 18, padding: 0, fontSize: 10, color: '#f38ba8', flexShrink: 0 }}
      >
        x
      </button>
    </div>
  );

  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: 8, gap: 4, overflow: 'auto', minHeight: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Tile Library</span>
        <button
          onClick={() => saveTilesetToLibrary()}
          disabled={!tileset}
          style={{ fontSize: 10, padding: '2px 6px' }}
        >
          Save Current
        </button>
      </div>
      {library.length === 0 ? (
        <span style={{ fontSize: 11, color: '#6c7086' }}>
          No saved tilesets. Import one to get started.
        </span>
      ) : (
        folders.map((folder) => {
          const items = grouped.get(folder)!;
          const isCollapsed = collapsedFolders.has(folder);

          if (folder === '') {
            // Ungrouped tilesets
            return items.map(renderTileset);
          }

          return (
            <div key={folder}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '2px 4px', cursor: 'pointer', fontSize: 11,
                  fontWeight: 600, color: '#89b4fa',
                }}
                onClick={() => toggleFolder(folder)}
              >
                <span style={{ fontSize: 10, width: 12 }}>{isCollapsed ? '+' : '-'}</span>
                <span>{folder}</span>
                <span style={{ fontWeight: 400, color: '#6c7086' }}>({items.length})</span>
              </div>
              {!isCollapsed && (
                <div style={{ paddingLeft: 12 }}>
                  {items.map(renderTileset)}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
