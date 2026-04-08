import { useState } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import type { ValidationMessage } from '../types/editor.js';

export function EntityPanel() {
  const scene = useEditorStore((s) => s.scene);
  const collection = useEditorStore((s) => s.currentCollection);
  const entities = scene.entities ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collectionErrors, setCollectionErrors] = useState<ValidationMessage[]>([]);

  const spawns = entities.filter((e) => e.type === 'spawn');
  const exits = entities.filter((e) => e.type === 'exit');
  const npcs = entities.filter((e) => e.type === 'npc');

  const otherScenes = collection?.scenes.filter(
    (s) => s.id !== useEditorStore.getState().currentSceneId,
  ) ?? [];

  const handleAssignTarget = (entityId: string, targetSceneId: string) => {
    useEditorStore.getState().updateEntity(entityId, {
      properties: {
        ...entities.find((e) => e.id === entityId)?.properties,
        targetSceneId,
      },
    });
    setEditingId(null);
  };

  const handleCollectionValidate = () => {
    const msgs: ValidationMessage[] = [];
    if (!collection) {
      msgs.push({ level: 'error', message: 'No collection — create one first' });
      setCollectionErrors(msgs);
      return;
    }

    for (const entry of collection.scenes) {
      const s = entry.scene;
      const ents = s.entities ?? [];
      const prefix = `[${entry.name}]`;

      if (!ents.some((e) => e.type === 'spawn')) {
        msgs.push({ level: 'error', message: `${prefix} No player spawn point` });
      }

      for (const exit of ents.filter((e) => e.type === 'exit')) {
        const tid = exit.properties?.targetSceneId as string | undefined;
        if (!tid) {
          msgs.push({ level: 'error', message: `${prefix} Exit at (${exit.x},${exit.y}) has no target scene` });
        } else if (!collection.scenes.some((sc) => sc.id === tid)) {
          msgs.push({ level: 'error', message: `${prefix} Exit at (${exit.x},${exit.y}) targets unknown scene` });
        }
      }

      if (!s.collisionLayer) {
        msgs.push({ level: 'warn', message: `${prefix} No collision layer` });
      }
    }

    // Check reachability: can we trace a path from first scene through exits?
    const visited = new Set<string>();
    const queue = [collection.scenes[0]?.id];
    while (queue.length > 0) {
      const sid = queue.shift()!;
      if (visited.has(sid)) continue;
      visited.add(sid);
      const entry = collection.scenes.find((s) => s.id === sid);
      if (!entry) continue;
      for (const exit of (entry.scene.entities ?? []).filter((e) => e.type === 'exit')) {
        const tid = exit.properties?.targetSceneId as string | undefined;
        if (tid && !visited.has(tid)) queue.push(tid);
      }
    }
    const unreachable = collection.scenes.filter((s) => !visited.has(s.id));
    for (const u of unreachable) {
      msgs.push({ level: 'warn', message: `[${u.name}] Unreachable — no exit leads here` });
    }

    if (msgs.length === 0) {
      msgs.push({ level: 'warn', message: 'All scenes valid! Collection ready for playtest.' });
    }

    setCollectionErrors(msgs);
  };

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', padding: 8, gap: 6,
        borderBottom: '1px solid #313244', overflow: 'auto',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600 }}>Scene Entities</div>

      {entities.length === 0 && (
        <span style={{ fontSize: 11, color: '#6c7086' }}>
          No entities. Use the tools above to place spawn, exits, NPCs.
        </span>
      )}

      {/* Spawn points */}
      {spawns.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#a6e3a1' }}>Spawn</div>
          {spawns.map((s) => (
            <div key={s.id} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '1px 0' }}>
              <span>({s.x}, {s.y})</span>
              <button
                onClick={() => useEditorStore.getState().removeEntity(s.id)}
                style={{ fontSize: 9, color: '#f38ba8', padding: '0 3px', marginLeft: 'auto' }}
              >x</button>
            </div>
          ))}
        </div>
      )}

      {/* Exit zones */}
      {exits.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#89b4fa' }}>Exits</div>
          {exits.map((exit) => {
            const targetId = exit.properties?.targetSceneId as string | undefined;
            const targetName = collection?.scenes.find((s) => s.id === targetId)?.name;
            return (
              <div key={exit.id} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0', flexWrap: 'wrap' }}>
                <span>({exit.x},{exit.y})</span>
                {editingId === exit.id ? (
                  <select
                    autoFocus
                    value={targetId ?? ''}
                    onChange={(e) => handleAssignTarget(exit.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    style={{
                      background: '#313244', color: '#cdd6f4', border: '1px solid #45475a',
                      borderRadius: 3, fontSize: 10, padding: '1px 2px',
                    }}
                  >
                    <option value="">— select scene —</option>
                    {otherScenes.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setEditingId(exit.id)}
                    style={{
                      fontSize: 10, padding: '1px 4px',
                      color: targetName ? '#89b4fa' : '#f38ba8',
                    }}
                  >
                    {targetName ?? 'Set target...'}
                  </button>
                )}
                <button
                  onClick={() => useEditorStore.getState().removeEntity(exit.id)}
                  style={{ fontSize: 9, color: '#f38ba8', padding: '0 3px', marginLeft: 'auto' }}
                >x</button>
              </div>
            );
          })}
        </div>
      )}

      {/* NPCs */}
      {npcs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#f9e2af' }}>NPCs</div>
          {npcs.map((npc) => (
            <div key={npc.id} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '1px 0' }}>
              <span>{(npc.properties?.name as string) ?? 'NPC'} ({npc.x},{npc.y})</span>
              <button
                onClick={() => useEditorStore.getState().removeEntity(npc.id)}
                style={{ fontSize: 9, color: '#f38ba8', padding: '0 3px', marginLeft: 'auto' }}
              >x</button>
            </div>
          ))}
        </div>
      )}

      {/* Collection validation */}
      <div style={{ borderTop: '1px solid #313244', paddingTop: 6, marginTop: 4 }}>
        <button onClick={handleCollectionValidate} style={{ fontSize: 11, width: '100%' }}>
          Validate Collection
        </button>
        {collectionErrors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
            {collectionErrors.map((msg, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  color: msg.level === 'error' ? '#f38ba8'
                    : msg.message.includes('ready') ? '#a6e3a1' : '#f9e2af',
                }}
              >
                {msg.message}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
