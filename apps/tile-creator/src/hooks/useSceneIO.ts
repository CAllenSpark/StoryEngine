import { useState, useCallback } from 'react';
import type { SceneJSON } from '@storyengine/shared';
import { useEditorStore } from '../store/editorStore.js';
import { logger } from '../logger.js';

export function useSceneIO() {
  const [importError, setImportError] = useState<string | null>(null);
  const loadScene = useEditorStore((s) => s.loadScene);
  const scene = useEditorStore((s) => s.scene);

  const exportScene = useCallback(() => {
    const json = JSON.stringify(scene, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene.json';
    a.click();
    URL.revokeObjectURL(url);
    logger.info('Scene exported');
  }, [scene]);

  const importScene = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as SceneJSON;

        if (
          typeof parsed.version !== 'number' ||
          typeof parsed.width !== 'number' ||
          typeof parsed.height !== 'number' ||
          typeof parsed.tileSize !== 'number' ||
          !Array.isArray(parsed.layers) ||
          !parsed.tileset
        ) {
          throw new Error('Invalid scene.json: missing required fields');
        }

        for (const layer of parsed.layers) {
          if (
            !layer.name ||
            !Array.isArray(layer.data) ||
            layer.data.length !== parsed.width * parsed.height
          ) {
            throw new Error(
              `Invalid layer "${layer.name ?? '?'}": data length must be ${parsed.width * parsed.height}`,
            );
          }
        }

        loadScene(parsed);
        setImportError(null);
        logger.info('Scene imported', {
          layers: parsed.layers.length,
          size: `${parsed.width}x${parsed.height}`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to import scene';
        setImportError(msg);
        logger.error('Scene import failed', { error: msg });
      }
    };

    input.click();
  }, [loadScene]);

  return { exportScene, importScene, importError };
}
