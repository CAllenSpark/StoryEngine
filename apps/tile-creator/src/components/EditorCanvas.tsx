import { useRef } from 'react';
import { useEditorCanvas } from '../hooks/useEditorCanvas.js';

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEditorCanvas(canvasRef);

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#11111b',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          imageRendering: 'pixelated',
          cursor: 'crosshair',
        }}
      />
    </div>
  );
}
