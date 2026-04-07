import type { SceneJSON, SceneCollection, SceneEntry } from '@storyengine/shared';
import type { EditorStore } from '../types/editor.js';
import { logger } from '../logger.js';
import { TILE_SIZE, TILEMAP_COLS, TILEMAP_ROWS } from '@storyengine/shared';

function createEmptyScene(): SceneJSON {
  return {
    version: 1,
    width: TILEMAP_COLS,
    height: TILEMAP_ROWS,
    tileSize: TILE_SIZE,
    layers: [
      { name: 'background', data: new Array(TILEMAP_COLS * TILEMAP_ROWS).fill(-1) },
      { name: 'midground', data: new Array(TILEMAP_COLS * TILEMAP_ROWS).fill(-1) },
      { name: 'foreground', data: new Array(TILEMAP_COLS * TILEMAP_ROWS).fill(-1) },
    ],
    tileset: { name: '', tileSize: TILE_SIZE, image: '', columns: 0 },
  };
}

type Get = () => EditorStore;
type Set = (partial: Partial<EditorStore>) => void;

export function createCollectionActions(set: Set, get: Get) {
  function syncCurrentScene() {
    const { currentCollection, currentSceneId, scene } = get();
    if (!currentCollection || !currentSceneId) return currentCollection;
    const scenes = currentCollection.scenes.map((e) =>
      e.id === currentSceneId ? { ...e, scene } : e,
    );
    const updated = { ...currentCollection, scenes, updatedAt: Date.now() };
    set({ currentCollection: updated });
    return updated;
  }

  return {
    createCollection(name: string) {
      const { scene } = get();
      const sceneId = crypto.randomUUID();
      const collection: SceneCollection = {
        id: crypto.randomUUID(),
        name,
        scenes: [{ id: sceneId, name: 'Scene 1', scene }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      set({ currentCollection: collection, currentSceneId: sceneId });
      logger.info('Created collection', { name });
    },

    addSceneToCollection(name: string) {
      syncCurrentScene();
      const { currentCollection } = get();
      if (!currentCollection) return;

      const sceneId = crypto.randomUUID();
      const newScene = createEmptyScene();
      const entry: SceneEntry = { id: sceneId, name, scene: newScene };
      const updated: SceneCollection = {
        ...currentCollection,
        scenes: [...currentCollection.scenes, entry],
        updatedAt: Date.now(),
      };
      set({
        currentCollection: updated,
        currentSceneId: sceneId,
        scene: newScene,
        activeLayerIndex: 0,
        layerVisibility: newScene.layers.map(() => true),
      } as Partial<EditorStore>);
      logger.info('Added scene to collection', { name });
    },

    switchScene(sceneId: string) {
      syncCurrentScene();
      const { currentCollection } = get();
      if (!currentCollection) return;
      const entry = currentCollection.scenes.find((e) => e.id === sceneId);
      if (!entry) return;
      set({
        currentSceneId: sceneId,
        scene: entry.scene,
        activeLayerIndex: 0,
        layerVisibility: entry.scene.layers.map(() => true),
      } as Partial<EditorStore>);
      logger.info('Switched scene', { name: entry.name });
    },

    renameScene(sceneId: string, name: string) {
      const { currentCollection } = get();
      if (!currentCollection) return;
      const scenes = currentCollection.scenes.map((e) =>
        e.id === sceneId ? { ...e, name } : e,
      );
      set({ currentCollection: { ...currentCollection, scenes, updatedAt: Date.now() } });
    },

    deleteScene(sceneId: string) {
      const { currentCollection, currentSceneId } = get();
      if (!currentCollection || currentCollection.scenes.length <= 1) return;
      const scenes = currentCollection.scenes.filter((e) => e.id !== sceneId);
      const updated = { ...currentCollection, scenes, updatedAt: Date.now() };
      set({ currentCollection: updated });
      if (currentSceneId === sceneId) {
        const first = scenes[0];
        set({
          currentSceneId: first.id,
          scene: first.scene,
          activeLayerIndex: 0,
          layerVisibility: first.scene.layers.map(() => true),
        } as Partial<EditorStore>);
      }
    },

    async saveCollectionToDb() {
      const collection = syncCurrentScene();
      if (!collection) return;
      try {
        const { saveCollection } = await import('../lib/assetDb.js');
        await saveCollection(collection);
        logger.info('Saved collection', { name: collection.name });
      } catch (err) {
        logger.warn('Failed to save collection', { error: String(err) });
      }
    },

    async loadCollectionFromDb(id: string) {
      try {
        const { loadCollection } = await import('../lib/assetDb.js');
        const collection = await loadCollection(id);
        if (!collection || collection.scenes.length === 0) return;
        const first = collection.scenes[0];
        set({
          currentCollection: collection,
          currentSceneId: first.id,
          scene: first.scene,
          activeLayerIndex: 0,
          layerVisibility: first.scene.layers.map(() => true),
        } as Partial<EditorStore>);
        logger.info('Loaded collection', { name: collection.name });
      } catch (err) {
        logger.warn('Failed to load collection', { error: String(err) });
      }
    },
  };
}
