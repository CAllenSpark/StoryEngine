import { useState } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import type { DialogueLine } from '@storyengine/shared';

interface NpcEditorProps {
  entityId: string;
  onClose: () => void;
}

export function NpcEditor({ entityId, onClose }: NpcEditorProps) {
  const entity = useEditorStore((s) =>
    (s.scene.entities ?? []).find((e) => e.id === entityId && e.type === 'npc'),
  );

  const spriteSheetLibrary = useEditorStore((s) => s.spriteSheetLibrary);

  const [name, setName] = useState<string>(
    entity?.properties?.name ?? 'NPC',
  );
  const [lines, setLines] = useState<DialogueLine[]>(
    entity?.properties?.dialogue ?? [],
  );
  const [spriteSheetId, setSpriteSheetId] = useState<string>(
    entity?.properties?.spriteSheetId ?? '',
  );

  if (!entity) return null;

  const updateLine = (index: number, patch: Partial<DialogueLine>) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { speaker: name, text: '' }]);
  };

  const handleSave = () => {
    useEditorStore.getState().updateEntity(entityId, {
      properties: {
        ...entity.properties,
        name,
        dialogue: lines,
        spriteSheetId: spriteSheetId || undefined,
      },
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#1e1e2e', border: '1px solid #313244',
          borderRadius: 8, padding: 16, maxWidth: 440, width: '100%',
          display: 'flex', flexDirection: 'column', gap: 10,
          maxHeight: '90vh', overflow: 'auto',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          NPC Editor — ({entity.x}, {entity.y})
        </div>

        {/* Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Name:</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              flex: 1, background: '#313244', color: '#cdd6f4',
              border: '1px solid #45475a', borderRadius: 4,
              padding: '2px 6px', fontSize: 12,
            }}
          />
        </div>

        {/* Sprite Sheet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Sprite:</span>
          <select
            value={spriteSheetId}
            onChange={(e) => setSpriteSheetId(e.target.value)}
            style={{
              flex: 1, background: '#313244', color: '#cdd6f4',
              border: '1px solid #45475a', borderRadius: 4,
              padding: '2px 6px', fontSize: 11,
            }}
          >
            <option value="">— none (yellow dot) —</option>
            {spriteSheetLibrary.map((s) => (
              <option key={s.id} value={s.id}>{s.def.name}</option>
            ))}
          </select>
        </div>

        {/* Dialogue lines */}
        <div style={{ fontSize: 12, fontWeight: 600 }}>Dialogue Lines:</div>
        {lines.length === 0 && (
          <span style={{ fontSize: 11, color: '#6c7086' }}>
            No dialogue. Add lines below.
          </span>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              display: 'flex', gap: 4, alignItems: 'center',
              border: '1px solid #313244', borderRadius: 4, padding: 4,
            }}
          >
            <input
              type="text"
              placeholder="Speaker"
              value={line.speaker}
              onChange={(e) => updateLine(i, { speaker: e.target.value })}
              style={{
                width: 70, background: '#313244', color: '#cdd6f4',
                border: '1px solid #45475a', borderRadius: 3,
                padding: '2px 4px', fontSize: 11,
              }}
            />
            <input
              type="text"
              placeholder="What they say..."
              value={line.text}
              onChange={(e) => updateLine(i, { text: e.target.value })}
              style={{
                flex: 1, background: '#313244', color: '#cdd6f4',
                border: '1px solid #45475a', borderRadius: 3,
                padding: '2px 4px', fontSize: 11,
              }}
            />
            <button
              onClick={() => removeLine(i)}
              style={{ fontSize: 9, color: '#f38ba8', padding: '0 4px' }}
            >x</button>
          </div>
        ))}
        <button
          onClick={addLine}
          style={{ fontSize: 11, alignSelf: 'flex-start' }}
        >
          + Add Dialogue Line
        </button>

        {/* Save / Cancel */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Cancel</button>
          <button className="active" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
