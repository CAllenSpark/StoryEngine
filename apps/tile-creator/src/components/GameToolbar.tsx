import { useState } from 'react';
import { useEditorStore } from '../store/editorStore.js';
import type { GameTool, ValidationMessage } from '../types/editor.js';

const GAME_TOOL_LABELS: Record<GameTool, string> = {
  collision: 'Collision',
  spawn: 'Spawn',
  exit: 'Exit Zone',
  npc: 'NPC',
};

export function GameToolbar() {
  const activeGameTool = useEditorStore((s) => s.activeGameTool);
  const showCollisionOverlay = useEditorStore((s) => s.showCollisionOverlay);
  const zoom = useEditorStore((s) => s.zoom);
  const setActiveGameTool = useEditorStore((s) => s.setActiveGameTool);
  const toggleCollisionOverlay = useEditorStore((s) => s.toggleCollisionOverlay);
  const setZoom = useEditorStore((s) => s.setZoom);
  const [validationMessages, setValidationMessages] = useState<ValidationMessage[]>([]);

  const handleValidate = () => {
    const msgs = useEditorStore.getState().validateScene();
    setValidationMessages(msgs);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderBottom: '1px solid #313244',
        background: '#181825',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
        <span style={{ fontSize: 14, fontWeight: 600, marginRight: 8, color: '#a6e3a1' }}>
          Game Mode
        </span>
        {(['collision', 'spawn', 'exit', 'npc'] as GameTool[]).map((tool) => (
          <button
            key={tool}
            className={activeGameTool === tool ? 'active' : ''}
            onClick={() => setActiveGameTool(tool)}
          >
            {GAME_TOOL_LABELS[tool]}
          </button>
        ))}
        <span style={{ marginLeft: 8, fontSize: 12, color: '#6c7086' }}>|</span>
        <button
          className={showCollisionOverlay ? 'active' : ''}
          onClick={toggleCollisionOverlay}
        >
          Show Collision
        </button>
        <button onClick={handleValidate}>
          Validate
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12 }}>Zoom:</span>
        <button onClick={() => setZoom(zoom - 1)}>-</button>
        <span style={{ fontSize: 12, minWidth: 24, textAlign: 'center' }}>{zoom}x</span>
        <button onClick={() => setZoom(zoom + 1)}>+</button>
      </div>

      {/* Tool hints */}
      <div style={{ padding: '2px 8px', fontSize: 11, color: '#6c7086' }}>
        {activeGameTool === 'collision' && 'Click to toggle blocked/walkable. Red = blocked.'}
        {activeGameTool === 'spawn' && 'Click a tile to set player start position. Green marker.'}
        {activeGameTool === 'exit' && 'Click a tile to place an exit zone. Blue marker.'}
        {activeGameTool === 'npc' && 'Click a tile to place an NPC. Yellow marker.'}
      </div>

      {/* Validation messages */}
      {validationMessages.length > 0 && (
        <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {validationMessages.map((msg, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                color: msg.level === 'error' ? '#f38ba8' : '#f9e2af',
              }}
            >
              {msg.level === 'error' ? 'Error' : 'Warning'}: {msg.message}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
