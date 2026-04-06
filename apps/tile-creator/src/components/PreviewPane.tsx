import { useRef } from 'react';
import { usePreviewBridge } from '../hooks/usePreviewBridge.js';

export function PreviewPane() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  usePreviewBridge(iframeRef);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 8,
        gap: 4,
        minHeight: 0,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600 }}>Preview</div>
      <iframe
        ref={iframeRef}
        src="/src/preview/index.html"
        sandbox="allow-scripts allow-same-origin"
        style={{
          flex: 1,
          border: '1px solid #313244',
          borderRadius: 4,
          background: '#11111b',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}
