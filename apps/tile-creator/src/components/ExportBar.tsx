import { useSceneIO } from '../hooks/useSceneIO.js';
import { useEditorStore } from '../store/editorStore.js';

export function ExportBar() {
  const { exportScene, importScene, exportCollection, importCollection, importError } = useSceneIO();
  const hasCollection = useEditorStore((s) => s.currentCollection !== null);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        borderTop: '1px solid #313244',
        background: '#181825',
      }}
    >
      <button onClick={exportScene}>Export Scene</button>
      <button onClick={importScene}>Import Scene</button>
      <span style={{ color: '#45475a' }}>|</span>
      <button onClick={exportCollection} disabled={!hasCollection}>Export Collection</button>
      <button onClick={importCollection}>Import Collection</button>
      {importError && (
        <span style={{ color: '#f38ba8', fontSize: 11 }}>{importError}</span>
      )}
    </div>
  );
}
