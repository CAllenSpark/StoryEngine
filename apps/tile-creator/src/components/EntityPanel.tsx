import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import { ActionEditor } from './ActionEditor.js';
import { NpcEditor } from './NpcEditor.js';
import type { ValidationMessage } from '../types/editor.js';
import type { ActionDef, DialogueLine } from '@storyengine/shared';

const SELECTED_STYLE = {
  background: 'rgba(137, 180, 250, 0.15)',
  borderLeft: '2px solid #89b4fa',
  paddingLeft: 4,
} as const;

export function EntityPanel() {
  const scene = useEditorStore((s) => s.scene);
  const collection = useEditorStore((s) => s.currentCollection);
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);
  const spriteSheetLibrary = useEditorStore((s) => s.spriteSheetLibrary);
  const entities = scene.entities ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNpcId, setEditingNpcId] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [collectionErrors, setCollectionErrors] = useState<ValidationMessage[]>([]);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected entity
  useEffect(() => {
    if (selectedEntityId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedEntityId]);

  const spawns = entities.filter((e) => e.type === 'spawn');
  const exits = entities.filter((e) => e.type === 'exit');
  const npcs = entities.filter((e) => e.type === 'npc');
  const actions = entities.filter((e) => e.type === 'action');

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
          {spawns.map((s) => {
            const spriteSheetId = (s.properties?.spriteSheetId as string) ?? '';
            return (
              <div
                key={s.id}
                ref={selectedEntityId === s.id ? selectedRef : undefined}
                onClick={() => useEditorStore.getState().setSelectedEntityId(s.id)}
                style={{
                  fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0',
                  cursor: 'pointer', borderRadius: 3,
                  ...(selectedEntityId === s.id ? SELECTED_STYLE : {}),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>({s.x}, {s.y})</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); useEditorStore.getState().removeEntity(s.id); }}
                    style={{ fontSize: 9, color: '#f38ba8', padding: '0 3px', marginLeft: 'auto' }}
                  >x</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                  <span style={{ color: '#6c7086' }}>sprite:</span>
                  <select
                    value={spriteSheetId}
                    onChange={(e) => {
                      e.stopPropagation();
                      useEditorStore.getState().updateEntity(s.id, {
                        properties: { ...s.properties, spriteSheetId: e.target.value || undefined },
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1, background: '#313244', color: '#cdd6f4',
                      border: '1px solid #45475a', borderRadius: 3,
                      padding: '1px 2px', fontSize: 10,
                    }}
                  >
                    <option value="">— placeholder —</option>
                    {spriteSheetLibrary.map((sheet) => (
                      <option key={sheet.id} value={sheet.id}>{sheet.def.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
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
              <div
                key={exit.id}
                ref={selectedEntityId === exit.id ? selectedRef : undefined}
                onClick={() => useEditorStore.getState().setSelectedEntityId(exit.id)}
                style={{
                  fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0',
                  flexWrap: 'wrap', cursor: 'pointer', borderRadius: 3,
                  ...(selectedEntityId === exit.id ? SELECTED_STYLE : {}),
                }}
              >
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
                  onClick={(e) => { e.stopPropagation(); useEditorStore.getState().removeEntity(exit.id); }}
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
          {npcs.map((npc) => {
            const dialogue = (npc.properties?.dialogue as DialogueLine[]) ?? [];
            return (
              <div
                key={npc.id}
                ref={selectedEntityId === npc.id ? selectedRef : undefined}
                onClick={() => useEditorStore.getState().setSelectedEntityId(npc.id)}
                style={{
                  fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0',
                  cursor: 'pointer', borderRadius: 3,
                  ...(selectedEntityId === npc.id ? SELECTED_STYLE : {}),
                }}
              >
                <span>{(npc.properties?.name as string) ?? 'NPC'} ({npc.x},{npc.y})</span>
                <span style={{ color: '#6c7086' }}>
                  {dialogue.length} line{dialogue.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setEditingNpcId(npc.id)}
                  style={{ fontSize: 9, padding: '0 4px', color: '#f9e2af' }}
                >edit</button>
                <button
                  onClick={(e) => { e.stopPropagation(); useEditorStore.getState().removeEntity(npc.id); }}
                  style={{ fontSize: 9, color: '#f38ba8', padding: '0 3px', marginLeft: 'auto' }}
                >x</button>
              </div>
            );
          })}
        </div>
      )}

      {editingNpcId && (
        <NpcEditor
          entityId={editingNpcId}
          onClose={() => setEditingNpcId(null)}
        />
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#cba6f7' }}>Actions</div>
          {actions.map((act) => {
            const actionDef = act.properties?.action as ActionDef | undefined;
            const stepCount = actionDef?.steps?.length ?? 0;
            const triggerLabel = actionDef?.trigger ?? 'interact';
            return (
              <div
                key={act.id}
                ref={selectedEntityId === act.id ? selectedRef : undefined}
                onClick={() => useEditorStore.getState().setSelectedEntityId(act.id)}
                style={{
                  fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0',
                  cursor: 'pointer', borderRadius: 3,
                  ...(selectedEntityId === act.id ? SELECTED_STYLE : {}),
                }}
              >
                <span>({act.x},{act.y})</span>
                <span style={{ color: '#6c7086' }}>{triggerLabel}</span>
                <span style={{ color: '#6c7086' }}>{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
                <button
                  onClick={() => setEditingActionId(act.id)}
                  style={{ fontSize: 9, padding: '0 4px', color: '#cba6f7' }}
                >edit</button>
                <button
                  onClick={(e) => { e.stopPropagation(); useEditorStore.getState().removeEntity(act.id); }}
                  style={{ fontSize: 9, color: '#f38ba8', padding: '0 3px', marginLeft: 'auto' }}
                >x</button>
              </div>
            );
          })}
        </div>
      )}

      {editingActionId && (
        <ActionEditor
          entityId={editingActionId}
          onClose={() => setEditingActionId(null)}
        />
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
