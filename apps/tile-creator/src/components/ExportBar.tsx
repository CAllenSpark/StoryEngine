import { useSceneIO } from '../hooks/useSceneIO.js';

export function ExportBar() {
  const { exportScene, importScene, importError } = useSceneIO();

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
      <button onClick={exportScene}>Export JSON</button>
      <button onClick={importScene}>Import JSON</button>
      {importError && (
        <span style={{ color: '#f38ba8', fontSize: 11 }}>{importError}</span>
      )}
    </div>
  );
}
