import { useState } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import type { ActionDef, ActionStep, ActionTrigger, ActionType } from '@storyengine/shared';

interface ActionEditorProps {
  entityId: string;
  onClose: () => void;
}

const TRIGGER_LABELS: Record<ActionTrigger, string> = {
  step: 'Player steps on tile',
  interact: 'Player interacts (button)',
  auto: 'Automatic on scene load',
  conditional: 'Conditional (flag/item)',
};

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  showDialogue: 'Show Dialogue',
  playGroupAnimation: 'Play Group Animation',
  changeScene: 'Change Scene',
  playVideo: 'Play Video',
  playAudio: 'Play Audio',
  stopAudio: 'Stop Audio',
  showImage: 'Show Image',
  showSlideshow: 'Show Slideshow',
  playerInput: 'Player Input Prompt',
  changePlayerState: 'Change Player State',
  playActorAnimation: 'Play Actor Animation',
};

const IMPLEMENTED_ACTIONS: ActionType[] = ['showDialogue', 'playGroupAnimation', 'changeScene'];
const STUB_ACTIONS: ActionType[] = ['playVideo', 'playAudio', 'stopAudio', 'showImage', 'showSlideshow', 'playerInput', 'changePlayerState', 'playActorAnimation'];

export function ActionEditor({ entityId, onClose }: ActionEditorProps) {
  const scene = useEditorStore((s) => s.scene);
  const collection = useEditorStore((s) => s.currentCollection);
  const entity = (scene.entities ?? []).find((e) => e.id === entityId);

  const actionRaw = entity?.properties?.action as ActionDef | undefined;
  const [action, setAction] = useState<ActionDef>(actionRaw ?? {
    trigger: 'interact',
    steps: [],
    oneShot: false,
  });

  if (!entity) return null;

  const updateAction = (patch: Partial<ActionDef>) => {
    setAction((prev) => ({ ...prev, ...patch }));
  };

  const addStep = (type: ActionType) => {
    const step: ActionStep = { type, params: getDefaultParams(type) };
    setAction((prev) => ({ ...prev, steps: [...prev.steps, step] }));
  };

  const updateStep = (index: number, params: Record<string, unknown>) => {
    setAction((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, params } : s)),
    }));
  };

  const removeStep = (index: number) => {
    setAction((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    useEditorStore.getState().updateEntity(entityId, {
      properties: { ...entity.properties, action },
    });
    onClose();
  };

  const groupAnimations = scene.groupAnimations ?? [];
  const otherScenes = collection?.scenes.filter(
    (s) => s.id !== useEditorStore.getState().currentSceneId,
  ) ?? [];

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
          borderRadius: 8, padding: 16, maxWidth: 480, width: '100%',
          display: 'flex', flexDirection: 'column', gap: 10,
          maxHeight: '90vh', overflow: 'auto',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          Action Editor — ({entity.x}, {entity.y})
        </div>

        {/* Trigger type */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Trigger:</span>
          <select
            value={action.trigger}
            onChange={(e) => updateAction({ trigger: e.target.value as ActionTrigger })}
            style={{
              background: '#313244', color: '#cdd6f4', border: '1px solid #45475a',
              borderRadius: 4, padding: '2px 6px', fontSize: 11,
            }}
          >
            {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Conditional */}
        {action.trigger === 'conditional' && (
          <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
            <label>
              Flag:
              <input
                type="text"
                value={(action.condition?.flag as string) ?? ''}
                onChange={(e) => updateAction({ condition: { ...action.condition, flag: e.target.value || undefined } })}
                placeholder="e.g. hasKey"
                style={{ width: 80, marginLeft: 4, background: '#313244', color: '#cdd6f4', border: '1px solid #45475a', borderRadius: 3, padding: '1px 4px', fontSize: 11 }}
              />
            </label>
          </div>
        )}

        {/* One-shot */}
        <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={action.oneShot ?? false}
            onChange={(e) => updateAction({ oneShot: e.target.checked })}
          />
          One-shot (only triggers once)
        </label>

        {/* Steps */}
        <div style={{ fontSize: 12, fontWeight: 600 }}>Action Steps:</div>
        {action.steps.length === 0 && (
          <span style={{ fontSize: 11, color: '#6c7086' }}>No steps. Add one below.</span>
        )}
        {action.steps.map((step, i) => (
          <div key={i} style={{
            border: '1px solid #313244', borderRadius: 6, padding: 8,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#cba6f7' }}>
                {i + 1}. {ACTION_TYPE_LABELS[step.type]}
              </span>
              <button
                onClick={() => removeStep(i)}
                style={{ marginLeft: 'auto', fontSize: 9, color: '#f38ba8', padding: '0 4px' }}
              >remove</button>
            </div>
            {renderStepEditor(step, i, updateStep, groupAnimations, otherScenes)}
          </div>
        ))}

        {/* Add step menu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: '#6c7086' }}>Add action step:</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {IMPLEMENTED_ACTIONS.map((type) => (
              <button key={type} onClick={() => addStep(type)} style={{ fontSize: 10, padding: '2px 6px' }}>
                {ACTION_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {STUB_ACTIONS.map((type) => (
              <button key={type} onClick={() => addStep(type)} style={{ fontSize: 10, padding: '2px 6px', opacity: 0.5 }} title="Coming soon">
                {ACTION_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Cancel</button>
          <button className="active" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

function getDefaultParams(type: ActionType): Record<string, unknown> {
  switch (type) {
    case 'showDialogue': return { lines: [{ speaker: '', text: '' }] };
    case 'playGroupAnimation': return { groupId: '' };
    case 'changeScene': return { targetSceneId: '', spawnX: 0, spawnY: 0 };
    case 'playVideo': return { url: '' };
    case 'playAudio': return { url: '', loop: false };
    case 'stopAudio': return {};
    case 'showImage': return { url: '', duration: 3000 };
    case 'showSlideshow': return { images: [], interval: 2000 };
    case 'playerInput': return { prompt: '', options: ['look', 'use', 'take'] };
    case 'changePlayerState': return { flag: '', value: true };
    case 'playActorAnimation': return { actorId: '', animation: '' };
    default: return {};
  }
}

function renderStepEditor(
  step: ActionStep,
  index: number,
  updateStep: (i: number, params: Record<string, unknown>) => void,
  groupAnimations: { id: string; name: string }[],
  otherScenes: { id: string; name: string }[],
) {
  const p = step.params;

  switch (step.type) {
    case 'showDialogue': {
      const lines = (p.lines as { speaker: string; text: string }[]) ?? [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {lines.map((line, li) => (
            <div key={li} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="text" placeholder="Speaker" value={line.speaker}
                onChange={(e) => {
                  const newLines = [...lines];
                  newLines[li] = { ...line, speaker: e.target.value };
                  updateStep(index, { ...p, lines: newLines });
                }}
                style={{ width: 60, background: '#313244', color: '#cdd6f4', border: '1px solid #45475a', borderRadius: 3, padding: '1px 4px', fontSize: 10 }}
              />
              <input
                type="text" placeholder="Dialogue text..." value={line.text}
                onChange={(e) => {
                  const newLines = [...lines];
                  newLines[li] = { ...line, text: e.target.value };
                  updateStep(index, { ...p, lines: newLines });
                }}
                style={{ flex: 1, background: '#313244', color: '#cdd6f4', border: '1px solid #45475a', borderRadius: 3, padding: '1px 4px', fontSize: 10 }}
              />
              <button onClick={() => {
                updateStep(index, { ...p, lines: lines.filter((_, i) => i !== li) });
              }} style={{ fontSize: 9, color: '#f38ba8', padding: '0 3px' }}>x</button>
            </div>
          ))}
          <button onClick={() => {
            updateStep(index, { ...p, lines: [...lines, { speaker: '', text: '' }] });
          }} style={{ fontSize: 10, alignSelf: 'flex-start' }}>+ Add Line</button>
        </div>
      );
    }
    case 'playGroupAnimation': {
      return (
        <select
          value={(p.groupId as string) ?? ''}
          onChange={(e) => updateStep(index, { ...p, groupId: e.target.value })}
          style={{ background: '#313244', color: '#cdd6f4', border: '1px solid #45475a', borderRadius: 3, fontSize: 10, padding: '1px 4px' }}
        >
          <option value="">— select group animation —</option>
          {groupAnimations.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      );
    }
    case 'changeScene': {
      return (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={(p.targetSceneId as string) ?? ''}
            onChange={(e) => updateStep(index, { ...p, targetSceneId: e.target.value })}
            style={{ background: '#313244', color: '#cdd6f4', border: '1px solid #45475a', borderRadius: 3, fontSize: 10, padding: '1px 4px' }}
          >
            <option value="">— select scene —</option>
            {otherScenes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span style={{ fontSize: 10 }}>Spawn:</span>
          <input
            type="number" value={(p.spawnX as number) ?? 0} min={0}
            onChange={(e) => updateStep(index, { ...p, spawnX: Number(e.target.value) })}
            style={{ width: 35, background: '#313244', color: '#cdd6f4', border: '1px solid #45475a', borderRadius: 3, padding: '1px 2px', fontSize: 10 }}
          />
          <input
            type="number" value={(p.spawnY as number) ?? 0} min={0}
            onChange={(e) => updateStep(index, { ...p, spawnY: Number(e.target.value) })}
            style={{ width: 35, background: '#313244', color: '#cdd6f4', border: '1px solid #45475a', borderRadius: 3, padding: '1px 2px', fontSize: 10 }}
          />
        </div>
      );
    }
    default:
      return <span style={{ fontSize: 10, color: '#6c7086', fontStyle: 'italic' }}>Editor coming soon</span>;
  }
}
