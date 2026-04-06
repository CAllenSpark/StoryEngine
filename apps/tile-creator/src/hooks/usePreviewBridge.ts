import { useEffect, useRef, type RefObject } from 'react';
import { useEditorStore } from '../store/editorStore.js';

interface PreviewMessage {
  type: 'scene-update';
  scene: typeof useEditorStore extends { getState: () => infer S }
    ? S extends { scene: infer SC } ? SC : never
    : never;
  tilesetImageDataUrl: string | null;
}

export function usePreviewBridge(iframeRef: RefObject<HTMLIFrameElement | null>) {
  const lastTilesetUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sendUpdate = () => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;

      const { scene, tileset } = useEditorStore.getState();
      const dataUrl = tileset?.imageDataUrl ?? null;
      const sendTileset = dataUrl !== lastTilesetUrlRef.current;
      if (sendTileset) lastTilesetUrlRef.current = dataUrl;

      const msg: PreviewMessage = {
        type: 'scene-update',
        scene,
        tilesetImageDataUrl: sendTileset ? dataUrl : null,
      };

      iframe.contentWindow.postMessage(msg, '*');
    };

    const debouncedSend = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(sendUpdate, 16);
    };

    const unsub = useEditorStore.subscribe(debouncedSend);

    const onLoad = () => {
      lastTilesetUrlRef.current = null;
      sendUpdate();
    };
    const iframe = iframeRef.current;
    iframe?.addEventListener('load', onLoad);

    return () => {
      unsub();
      iframe?.removeEventListener('load', onLoad);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [iframeRef]);
}
