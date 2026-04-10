import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { SpriteSheetImportDialog } from './SpriteSheetImportDialog.js';

export function SpriteLibraryPanel() {
  const library = useEditorStore((s) => s.spriteSheetLibrary);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', padding: 8, gap: 6,
      borderBottom: '1px solid #313244',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Sprite Library</span>
        <button
          onClick={() => setShowImportDialog(true)}
          style={{ fontSize: 10, marginLeft: 'auto' }}
        >
          + Import
        </button>
      </div>

      {library.length === 0 && (
        <span style={{ fontSize: 10, color: '#6c7086' }}>
          No sprite sheets. Import a PNG to get started.
        </span>
      )}

      {library.map((sheet) => (
        <SpriteLibraryEntry
          key={sheet.id}
          id={sheet.id}
          name={sheet.def.name}
          dataUrl={sheet.dataUrl}
          frameWidth={sheet.def.frameWidth}
          frameHeight={sheet.def.frameHeight}
          stateCount={sheet.def.states.length}
          onEdit={() => setEditingId(sheet.id)}
        />
      ))}

      {showImportDialog && (
        <SpriteSheetImportDialog onClose={() => setShowImportDialog(false)} />
      )}
      {editingId && (
        <SpriteSheetImportDialog
          existingId={editingId}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

interface EntryProps {
  id: string;
  name: string;
  dataUrl: string;
  frameWidth: number;
  frameHeight: number;
  stateCount: number;
  onEdit: () => void;
}

function SpriteLibraryEntry({ id, name, dataUrl, frameWidth, frameHeight, stateCount, onEdit }: EntryProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw the first frame as a thumbnail
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      canvas.width = frameWidth * scale;
      canvas.height = frameHeight * scale;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, frameWidth, frameHeight, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  }, [dataUrl, frameWidth, frameHeight]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: 4, borderRadius: 4,
      background: '#11111b', border: '1px solid #313244',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          imageRendering: 'pixelated',
          border: '1px solid #45475a',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <span style={{ fontSize: 9, color: '#6c7086' }}>
          {frameWidth}×{frameHeight} · {stateCount} state{stateCount !== 1 ? 's' : ''}
        </span>
      </div>
      <button onClick={onEdit} style={{ fontSize: 9, padding: '1px 4px' }}>edit</button>
      <button
        onClick={() => {
          if (confirm(`Delete sprite sheet "${name}"?`)) {
            useEditorStore.getState().deleteSpriteSheet(id);
          }
        }}
        style={{ fontSize: 9, color: '#f38ba8', padding: '0 3px' }}
      >×</button>
    </div>
  );
}
