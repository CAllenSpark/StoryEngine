import { useEditorStore } from '../store/editorStore.js';

export function TilesetLibrary() {
  const library = useEditorStore((s) => s.tilesetLibrary);
  const currentTilesetId = useEditorStore((s) => s.currentTilesetId);
  const switchTileset = useEditorStore((s) => s.switchTileset);
  const deleteTilesetFromLibrary = useEditorStore((s) => s.deleteTilesetFromLibrary);
  const saveTilesetToLibrary = useEditorStore((s) => s.saveTilesetToLibrary);
  const tileset = useEditorStore((s) => s.tileset);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 8,
        gap: 4,
        overflow: 'auto',
        minHeight: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>
          Tile Library
        </span>
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
        library.map((ts) => (
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
                width: 20,
                height: 20,
                background: '#45475a',
                borderRadius: 2,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                color: '#6c7086',
              }}
            >
              {ts.tileSize}
            </div>
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ts.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTilesetFromLibrary(ts.id);
              }}
              style={{
                width: 18,
                height: 18,
                padding: 0,
                fontSize: 10,
                color: '#f38ba8',
                flexShrink: 0,
              }}
            >
              x
            </button>
          </div>
        ))
      )}
    </div>
  );
}
