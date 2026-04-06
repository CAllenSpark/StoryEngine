import { create } from 'zustand';
import { temporal } from 'zundo';
import { TILE_SIZE, TILEMAP_COLS, TILEMAP_ROWS } from '@storyengine/shared';
import type { SceneJSON, TileLayer } from '@storyengine/shared';
import type { EditorStore, TilesetState, Tool } from '../types/editor.js';
import { HISTORY_LIMIT } from './historyMiddleware.js';

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

      paintTile(x: number, y: number) {
        const { scene, activeLayerIndex, selectedTileId } = get();
        if (selectedTileId < 0) return;
        if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) return;
        const idx = y * scene.width + x;
        const layer = scene.layers[activeLayerIndex];
        if (layer.data[idx] === selectedTileId) return;

        const newData = [...layer.data];
        newData[idx] = selectedTileId;
        const newLayer = { ...layer, data: newData };
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
        const newLayer = { ...layer, data: newData };
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
        const { scene, layerVisibility } = get();
        if (from === to) return;
        if (from < 0 || from >= scene.layers.length) return;
        if (to < 0 || to >= scene.layers.length) return;

        const newLayers = [...scene.layers];
        const [moved] = newLayers.splice(from, 1);
        newLayers.splice(to, 0, moved);

        const newVisibility = [...layerVisibility];
        const [movedVis] = newVisibility.splice(from, 1);
        newVisibility.splice(to, 0, movedVis);

        set({
          scene: { ...scene, layers: newLayers },
          layerVisibility: newVisibility,
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

      loadScene(scene: SceneJSON) {
        set({
          scene,
          activeLayerIndex: 0,
          layerVisibility: scene.layers.map(() => true),
        });
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
