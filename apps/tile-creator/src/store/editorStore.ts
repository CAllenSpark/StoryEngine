import { create } from 'zustand';
import { temporal } from 'zundo';
import { TILE_SIZE, TILEMAP_COLS, TILEMAP_ROWS } from '@storyengine/shared';
import type { SceneJSON, TileLayer } from '@storyengine/shared';
import type { EditorStore, TilesetState, Tool } from '../types/editor.js';
import type { StoredTileset } from '../lib/assetDb.js';
import { HISTORY_LIMIT } from './historyMiddleware.js';
import { logger } from '../logger.js';

async function restoreTilesetFromStored(
  stored: StoredTileset,
): Promise<TilesetState> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load stored tileset'));
    img.src = stored.dataUrl;
  });

  const columns = stored.columns;
  const rows = Math.floor(img.height / stored.tileSize);
  const tileImages: ImageBitmap[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const bmp = await createImageBitmap(
        img, c * stored.tileSize, r * stored.tileSize, stored.tileSize, stored.tileSize,
      );
      tileImages.push(bmp);
    }
  }

  const name = stored.name || stored.filename.replace(/\.[^.]+$/, '');
  return {
    ref: { name, tileSize: stored.tileSize, image: stored.filename, columns },
    imageDataUrl: stored.dataUrl,
    tileImages,
  };
}

function createEmptyLayer(name: string): TileLayer {
  return {
    name,
    data: new Array(TILEMAP_COLS * TILEMAP_ROWS).fill(-1),
  };
}

function createDefaultScene(): SceneJSON {
  return {
    version: 1,
    width: TILEMAP_COLS,
    height: TILEMAP_ROWS,
    tileSize: TILE_SIZE,
    layers: [
      createEmptyLayer('background'),
      createEmptyLayer('midground'),
      createEmptyLayer('foreground'),
    ],
    tileset: { name: '', tileSize: TILE_SIZE, image: '', columns: 0 },
  };
}

export const useEditorStore = create<EditorStore>()(
  temporal(
    (set, get) => ({
      scene: createDefaultScene(),
      activeTool: 'paint' as Tool,
      selectedTileId: -1,
      activeLayerIndex: 0,
      layerVisibility: [true, true, true],
      zoom: 2,
      tileset: null,
      currentRotation: 0,
      tilesetLibrary: [],
      currentTilesetId: null,

      paintTile(x: number, y: number) {
        const { scene, activeLayerIndex, selectedTileId, tileset } = get();
        if (selectedTileId < 0) return;
        if (tileset && selectedTileId >= tileset.tileImages.length) return;
        if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) return;
        const idx = y * scene.width + x;
        const layer = scene.layers[activeLayerIndex];
        if (layer.data[idx] === selectedTileId) return;

        const newData = [...layer.data];
        newData[idx] = selectedTileId;
        const currentRotation = get().currentRotation;
        const newTransforms = layer.transforms
          ? [...layer.transforms]
          : new Array(scene.width * scene.height).fill(0);
        newTransforms[idx] = currentRotation;
        const newLayer = { ...layer, data: newData, transforms: newTransforms };
        const newLayers = [...scene.layers];
        newLayers[activeLayerIndex] = newLayer;
        set({ scene: { ...scene, layers: newLayers } });
      },

      eraseTile(x: number, y: number) {
        const { scene, activeLayerIndex } = get();
        if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) return;
        const idx = y * scene.width + x;
        const layer = scene.layers[activeLayerIndex];
        if (layer.data[idx] === -1) return;

        const newData = [...layer.data];
        newData[idx] = -1;
        const newTransforms = layer.transforms
          ? [...layer.transforms]
          : new Array(scene.width * scene.height).fill(0);
        newTransforms[idx] = 0;
        const newLayer = { ...layer, data: newData, transforms: newTransforms };
        const newLayers = [...scene.layers];
        newLayers[activeLayerIndex] = newLayer;
        set({ scene: { ...scene, layers: newLayers } });
      },

      addLayer(name: string) {
        const { scene, layerVisibility } = get();
        const newLayer = createEmptyLayer(name);
        set({
          scene: { ...scene, layers: [...scene.layers, newLayer] },
          layerVisibility: [...layerVisibility, true],
        });
      },

      removeLayer(index: number) {
        const { scene, layerVisibility, activeLayerIndex } = get();
        if (scene.layers.length <= 1) return;
        if (index < 0 || index >= scene.layers.length) return;

        const newLayers = scene.layers.filter((_: unknown, i: number) => i !== index);
        const newVisibility = layerVisibility.filter((_: boolean, i: number) => i !== index);
        const newActive = activeLayerIndex >= newLayers.length
          ? newLayers.length - 1
          : activeLayerIndex > index
            ? activeLayerIndex - 1
            : activeLayerIndex;

        set({
          scene: { ...scene, layers: newLayers },
          layerVisibility: newVisibility,
          activeLayerIndex: newActive,
        });
      },

      moveLayer(from: number, to: number) {
        const { scene, layerVisibility, activeLayerIndex } = get();
        if (from === to) return;
        if (from < 0 || from >= scene.layers.length) return;
        if (to < 0 || to >= scene.layers.length) return;

        const newLayers = [...scene.layers];
        const [moved] = newLayers.splice(from, 1);
        newLayers.splice(to, 0, moved);

        const newVisibility = [...layerVisibility];
        const [movedVis] = newVisibility.splice(from, 1);
        newVisibility.splice(to, 0, movedVis);

        let newActive = activeLayerIndex;
        if (activeLayerIndex === from) newActive = to;
        else if (from < to && activeLayerIndex > from && activeLayerIndex <= to) newActive--;
        else if (from > to && activeLayerIndex < from && activeLayerIndex >= to) newActive++;

        set({
          scene: { ...scene, layers: newLayers },
          layerVisibility: newVisibility,
          activeLayerIndex: newActive,
        });
      },

      renameLayer(index: number, name: string) {
        const { scene } = get();
        if (index < 0 || index >= scene.layers.length) return;
        const newLayers = [...scene.layers];
        newLayers[index] = { ...newLayers[index], name };
        set({ scene: { ...scene, layers: newLayers } });
      },

      setActiveTool(tool: Tool) {
        set({ activeTool: tool });
      },

      setSelectedTile(id: number) {
        set({ selectedTileId: id });
      },

      setActiveLayer(index: number) {
        const { scene } = get();
        if (index < 0 || index >= scene.layers.length) return;
        set({ activeLayerIndex: index });
      },

      toggleLayerVisibility(index: number) {
        const { layerVisibility } = get();
        if (index < 0 || index >= layerVisibility.length) return;
        const newVisibility = [...layerVisibility];
        newVisibility[index] = !newVisibility[index];
        set({ layerVisibility: newVisibility });
      },

      setZoom(zoom: number) {
        set({ zoom: Math.max(1, Math.min(8, zoom)) });
      },

      setTileset(tileset: TilesetState) {
        const { scene } = get();
        set({
          tileset,
          scene: { ...scene, tileset: tileset.ref },
        });
      },

      setRotation(rotation: number) {
        set({ currentRotation: ((rotation % 4) + 4) % 4 });
      },

      rotateTileAt(x: number, y: number) {
        const { scene, activeLayerIndex } = get();
        if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) return;
        const idx = y * scene.width + x;
        const layer = scene.layers[activeLayerIndex];
        if (layer.data[idx] < 0) return;
        const currentTransforms = layer.transforms
          ? [...layer.transforms]
          : new Array(scene.width * scene.height).fill(0);
        currentTransforms[idx] = (currentTransforms[idx] + 1) % 4;
        const newLayer = { ...layer, transforms: currentTransforms };
        const newLayers = [...scene.layers];
        newLayers[activeLayerIndex] = newLayer;
        set({ scene: { ...scene, layers: newLayers } });
      },

      loadScene(scene: SceneJSON) {
        set({
          scene,
          activeLayerIndex: 0,
          layerVisibility: scene.layers.map(() => true),
        });
      },

      async restoreTileset() {
        try {
          const { listAllTilesets } = await import('../lib/assetDb.js');
          const all = await listAllTilesets();
          set({ tilesetLibrary: all });
          if (all.length === 0) return;
          const latest = all.reduce((a, b) => a.storedAt > b.storedAt ? a : b);
          const tilesetState = await restoreTilesetFromStored(latest);
          get().setTileset(tilesetState);
          set({ currentTilesetId: latest.id });
          logger.info('Tileset restored from IndexedDB', { name: latest.name, tileCount: tilesetState.tileImages.length });
        } catch (err) {
          logger.warn('Failed to restore tileset from IndexedDB', { error: String(err) });
        }
      },

      async loadLibrary() {
        try {
          const { listAllTilesets } = await import('../lib/assetDb.js');
          set({ tilesetLibrary: await listAllTilesets() });
        } catch (err) {
          logger.warn('Failed to load tileset library', { error: String(err) });
        }
      },

      async switchTileset(id: string) {
        try {
          const { loadTilesetById } = await import('../lib/assetDb.js');
          const stored = await loadTilesetById(id);
          if (!stored) return;
          const tilesetState = await restoreTilesetFromStored(stored);
          get().setTileset(tilesetState);
          set({ currentTilesetId: id });
          logger.info('Switched tileset', { name: stored.name });
        } catch (err) {
          logger.warn('Failed to switch tileset', { error: String(err) });
        }
      },

      async deleteTilesetFromLibrary(id: string) {
        try {
          const { deleteTilesetById, listAllTilesets } = await import('../lib/assetDb.js');
          await deleteTilesetById(id);
          const all = await listAllTilesets();
          const updates: Partial<EditorStore> = { tilesetLibrary: all };
          if (get().currentTilesetId === id) {
            updates.tileset = null;
            updates.currentTilesetId = null;
          }
          set(updates as EditorStore);
          logger.info('Deleted tileset from library', { id });
        } catch (err) {
          logger.warn('Failed to delete tileset', { error: String(err) });
        }
      },

      async saveTilesetToLibrary() {
        const { tileset } = get();
        if (!tileset) return;
        try {
          const { saveTilesetToLibrary: saveToLib, listAllTilesets } = await import('../lib/assetDb.js');
          const id = get().currentTilesetId ?? crypto.randomUUID();
          await saveToLib({
            id,
            name: tileset.ref.name,
            filename: tileset.ref.image,
            dataUrl: tileset.imageDataUrl,
            tileSize: tileset.ref.tileSize,
            columns: tileset.ref.columns,
            storedAt: Date.now(),
          });
          set({ currentTilesetId: id, tilesetLibrary: await listAllTilesets() });
          logger.info('Saved tileset to library', { name: tileset.ref.name });
        } catch (err) {
          logger.warn('Failed to save tileset to library', { error: String(err) });
        }
      },
    }),
    {
      limit: HISTORY_LIMIT,
      partialize: (state) => {
        const { scene } = state;
        return { scene } as EditorStore;
      },
      equality: (pastState, currentState) =>
        pastState.scene === currentState.scene,
    },
  ),
);

export { createDefaultScene, createEmptyLayer };
