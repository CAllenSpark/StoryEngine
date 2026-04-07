import { useState, useCallback } from 'react';
import type { SceneJSON, CollectionExport } from '@storyengine/shared';
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

  const exportCollection = useCallback(() => {
    const collection = useEditorStore.getState().currentCollection;
    if (!collection) return;
    const data: CollectionExport = { version: 2, collection };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.collection.json`;
    a.click();
    URL.revokeObjectURL(url);
    logger.info('Collection exported', { name: collection.name });
  }, []);

  const importCollection = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as CollectionExport;

        if (parsed.version !== 2 || !parsed.collection || !Array.isArray(parsed.collection.scenes)) {
          throw new Error('Invalid collection file');
        }

        if (parsed.collection.scenes.length === 0) {
          throw new Error('Collection has no scenes');
        }

        const { collection } = parsed;
        const first = collection.scenes[0];
        useEditorStore.setState({
          currentCollection: collection,
          currentSceneId: first.id,
          scene: first.scene,
          activeLayerIndex: 0,
          layerVisibility: first.scene.layers.map(() => true),
        });

        setImportError(null);
        logger.info('Collection imported', {
          name: collection.name,
          scenes: collection.scenes.length,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to import collection';
        setImportError(msg);
        logger.error('Collection import failed', { error: msg });
      }
    };

    input.click();
  }, []);

  return { exportScene, importScene, exportCollection, importCollection, importError };
}
