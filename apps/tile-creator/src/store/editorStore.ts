import { create } from 'zustand';
import { temporal } from 'zundo';
import { TILE_SIZE, TILEMAP_COLS, TILEMAP_ROWS } from '@storyengine/shared';
import type { SceneJSON, TileLayer } from '@storyengine/shared';
import type { EditorStore, TilesetState, Tool } from '../types/editor.js';
import type { StoredTileset } from '../lib/assetDb.js';
import { HISTORY_LIMIT } from './historyMiddleware.js';
import { createCollectionActions } from './collectionActions.js';
import { encodeTransform, decodeTransform } from '../lib/transformUtils.js';
import { logger } from '../logger.js';

/** Clone or create a transforms array for immutable layer updates. */
function cloneTransforms(layer: TileLayer, size: number): number[] {
  return layer.transforms ? [...layer.transforms] : new Array(size).fill(0);
}

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
      currentCollection: null,
      currentSceneId: null,
      selectionBounds: null,
      clipboard: null,
      currentFlipH: false,
      currentFlipV: false,
      prefabLibrary: [],
      currentColor: '#a6e3a1',
      colorTileMap: {},
      animClock: 0,
      animationLibrary: [],
      editingGroupAnimationId: null,
      selectedEntityId: null as string | null,
      spriteSheetLibrary: [] as import('../lib/assetDb.js').StoredSpriteSheet[],
      brushStamp: null as import('../types/editor.js').BrushStamp | null,
      editorMode: 'art' as import('../types/editor.js').EditorMode,
      activeGameTool: 'collision' as import('../types/editor.js').GameTool,
      showCollisionOverlay: false,

      paintTile(x: number, y: number) {
        const { scene, activeLayerIndex, selectedTileId, tileset, currentRotation, currentFlipH, currentFlipV } = get();
        if (selectedTileId < 0) return;
        if (tileset && selectedTileId >= tileset.tileImages.length) return;
        if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) return;
        const idx = y * scene.width + x;
        const layer = scene.layers[activeLayerIndex];
        const newTransformVal = encodeTransform(currentRotation, currentFlipH, currentFlipV);
        if (layer.data[idx] === selectedTileId && (layer.transforms?.[idx] ?? 0) === newTransformVal) return;

        const newData = [...layer.data];
        newData[idx] = selectedTileId;
        const newTransforms = cloneTransforms(layer, scene.width * scene.height);
        newTransforms[idx] = newTransformVal;
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
        const newTransforms = cloneTransforms(layer, scene.width * scene.height);
        newTransforms[idx] = 0;
        const newLayer = { ...layer, data: newData, transforms: newTransforms };
        const newLayers = [...scene.layers];
        newLayers[activeLayerIndex] = newLayer;
        set({ scene: { ...scene, layers: newLayers } });
      },

      eraseSelection() {
        const { scene, activeLayerIndex, selectionBounds } = get();
        if (!selectionBounds) return;
        const { x1, y1, x2, y2 } = selectionBounds;
        const layer = scene.layers[activeLayerIndex];
        const newData = [...layer.data];
        const newTransforms = cloneTransforms(layer, scene.width * scene.height);
        for (let y = y1; y <= y2; y++) {
          for (let x = x1; x <= x2; x++) {
            const idx = y * scene.width + x;
            newData[idx] = -1;
            newTransforms[idx] = 0;
          }
        }
        const newLayer = { ...layer, data: newData, transforms: newTransforms };
        const newLayers = [...scene.layers];
        newLayers[activeLayerIndex] = newLayer;
        set({ scene: { ...scene, layers: newLayers }, selectionBounds: null });
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
          selectedTileId: 0,
          clipboard: null,
          selectionBounds: null,
        });
      },

      mergeTileset(incoming: TilesetState) {
        const { tileset: existing, scene } = get();
        if (!existing) {
          // No existing tileset — just set it
          get().setTileset(incoming);
          return;
        }
        // Append incoming tiles to existing
        const mergedTileImages = [...existing.tileImages, ...incoming.tileImages];
        const columns = Math.max(existing.ref.columns, incoming.ref.columns, 8);
        const mergedRef = {
          ...existing.ref,
          columns,
          name: existing.ref.name,
        };
        const merged: TilesetState = {
          ref: mergedRef,
          imageDataUrl: existing.imageDataUrl,
          tileImages: mergedTileImages,
        };
        set({
          tileset: merged,
          scene: { ...scene, tileset: mergedRef },
          selectedTileId: existing.tileImages.length, // Select first new tile
          clipboard: null,
          selectionBounds: null,
          colorTileMap: {},
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
        const decoded = decodeTransform(currentTransforms[idx]);
        currentTransforms[idx] = encodeTransform((decoded.rotation + 1) % 4, decoded.flipH, decoded.flipV);
        const newLayer = { ...layer, transforms: currentTransforms };
        const newLayers = [...scene.layers];
        newLayers[activeLayerIndex] = newLayer;
        set({ scene: { ...scene, layers: newLayers } });
      },

      toggleFlipH() {
        set({ currentFlipH: !get().currentFlipH });
      },

      toggleFlipV() {
        set({ currentFlipV: !get().currentFlipV });
      },

      flipTileAt(x: number, y: number, axis: 'h' | 'v') {
        const { scene, activeLayerIndex } = get();
        if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) return;
        const idx = y * scene.width + x;
        const layer = scene.layers[activeLayerIndex];
        if (layer.data[idx] < 0) return;
        const currentTransforms = layer.transforms
          ? [...layer.transforms]
          : new Array(scene.width * scene.height).fill(0);
        const decoded = decodeTransform(currentTransforms[idx]);
        if (axis === 'h') decoded.flipH = !decoded.flipH;
        else decoded.flipV = !decoded.flipV;
        currentTransforms[idx] = encodeTransform(decoded.rotation, decoded.flipH, decoded.flipV);
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

      async mergeFromLibrary(id: string) {
        try {
          const { loadTilesetById } = await import('../lib/assetDb.js');
          const stored = await loadTilesetById(id);
          if (!stored) return;
          const tilesetState = await restoreTilesetFromStored(stored);
          get().mergeTileset(tilesetState);
          logger.info('Merged tileset from library', { name: stored.name });
        } catch (err) {
          logger.warn('Failed to merge tileset from library', { error: String(err) });
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

      selectArea(x1: number, y1: number, x2: number, y2: number) {
        const { scene } = get();
        const nx1 = Math.max(0, Math.min(x1, x2));
        const ny1 = Math.max(0, Math.min(y1, y2));
        const nx2 = Math.min(scene.width - 1, Math.max(x1, x2));
        const ny2 = Math.min(scene.height - 1, Math.max(y1, y2));
        set({ selectionBounds: { x1: nx1, y1: ny1, x2: nx2, y2: ny2 } });
      },

      copySelection() {
        const { scene, activeLayerIndex, selectionBounds } = get();
        if (!selectionBounds) return;
        const { x1, y1, x2, y2 } = selectionBounds;
        const w = x2 - x1 + 1;
        const h = y2 - y1 + 1;
        const layer = scene.layers[activeLayerIndex];
        const tiles: number[] = [];
        const transforms: number[] = [];
        for (let y = y1; y <= y2; y++) {
          for (let x = x1; x <= x2; x++) {
            const idx = y * scene.width + x;
            tiles.push(layer.data[idx]);
            transforms.push(layer.transforms?.[idx] ?? 0);
          }
        }
        set({ clipboard: { width: w, height: h, tiles, transforms } });
      },

      stampClipboard(destX: number, destY: number) {
        const { scene, activeLayerIndex, clipboard } = get();
        if (!clipboard) return;
        const layer = scene.layers[activeLayerIndex];
        const newData = [...layer.data];
        const newTransforms = cloneTransforms(layer, scene.width * scene.height);
        for (let cy = 0; cy < clipboard.height; cy++) {
          for (let cx = 0; cx < clipboard.width; cx++) {
            const sx = destX + cx;
            const sy = destY + cy;
            if (sx < 0 || sx >= scene.width || sy < 0 || sy >= scene.height) continue;
            const srcIdx = cy * clipboard.width + cx;
            const tileId = clipboard.tiles[srcIdx];
            if (tileId < 0) continue;
            const destIdx = sy * scene.width + sx;
            newData[destIdx] = tileId;
            newTransforms[destIdx] = clipboard.transforms[srcIdx];
          }
        }
        const newLayer = { ...layer, data: newData, transforms: newTransforms };
        const newLayers = [...scene.layers];
        newLayers[activeLayerIndex] = newLayer;
        set({ scene: { ...scene, layers: newLayers } });
      },

      clearSelection() {
        set({ selectionBounds: null, clipboard: null });
      },

      async savePrefabFromClipboard(name: string) {
        const { clipboard } = get();
        if (!clipboard) return;
        try {
          const { savePrefab } = await import('../lib/assetDb.js');
          const prefab = {
            id: crypto.randomUUID(),
            name,
            width: clipboard.width,
            height: clipboard.height,
            tiles: clipboard.tiles,
            transforms: clipboard.transforms,
            createdAt: Date.now(),
          };
          await savePrefab(prefab);
          await get().loadPrefabLibrary();
          logger.info('Saved prefab', { name });
        } catch (err) {
          logger.warn('Failed to save prefab', { error: String(err) });
        }
      },

      async loadPrefab(id: string) {
        const { prefabLibrary } = get();
        const prefab = prefabLibrary.find((p) => p.id === id);
        if (!prefab) return;
        set({
          clipboard: {
            width: prefab.width,
            height: prefab.height,
            tiles: prefab.tiles,
            transforms: prefab.transforms,
          },
          activeTool: 'select',
          selectionBounds: null,
        });
      },

      async deletePrefab(id: string) {
        try {
          const { deletePrefabById } = await import('../lib/assetDb.js');
          await deletePrefabById(id);
          await get().loadPrefabLibrary();
        } catch (err) {
          logger.warn('Failed to delete prefab', { error: String(err) });
        }
      },

      async loadPrefabLibrary() {
        try {
          const { listPrefabs } = await import('../lib/assetDb.js');
          const prefabs = await listPrefabs();
          set({ prefabLibrary: prefabs });
        } catch (err) {
          logger.warn('Failed to load prefab library', { error: String(err) });
        }
      },

      async loadSpriteSheetLibrary() {
        try {
          const { listSpriteSheets } = await import('../lib/assetDb.js');
          const sheets = await listSpriteSheets();
          set({ spriteSheetLibrary: sheets });
        } catch (err) {
          logger.warn('Failed to load sprite sheet library', { error: String(err) });
        }
      },

      async saveSpriteSheet(def: import('@storyengine/shared').SpriteSheetDef, dataUrl: string) {
        const { saveSpriteSheet, listSpriteSheets } = await import('../lib/assetDb.js');
        await saveSpriteSheet({
          id: def.id,
          def,
          dataUrl,
          storedAt: Date.now(),
        });
        const sheets = await listSpriteSheets();
        set({ spriteSheetLibrary: sheets });
      },

      async deleteSpriteSheet(id: string) {
        const { deleteSpriteSheetById, listSpriteSheets } = await import('../lib/assetDb.js');
        await deleteSpriteSheetById(id);
        const sheets = await listSpriteSheets();
        set({ spriteSheetLibrary: sheets });
      },

      setColor(color: string) {
        set({ currentColor: color });
      },

      setTileAnimation(baseTileId: number, phases: import('@storyengine/shared').AnimationPhase[]) {
        const { tileset, scene } = get();
        if (!tileset) return;
        const animations = { ...tileset.ref.animations, [String(baseTileId)]: { phases } };
        const ref = { ...tileset.ref, animations };
        set({
          tileset: { ...tileset, ref },
          scene: { ...scene, tileset: ref },
        });
      },

      removeTileAnimation(baseTileId: number) {
        const { tileset, scene } = get();
        if (!tileset?.ref.animations) return;
        const animations = { ...tileset.ref.animations };
        delete animations[String(baseTileId)];
        const ref = { ...tileset.ref, animations: Object.keys(animations).length > 0 ? animations : undefined };
        set({
          tileset: { ...tileset, ref },
          scene: { ...scene, tileset: ref },
        });
      },

      tickAnimation() {
        set((s) => ({ animClock: s.animClock + 250 }));
      },

      async saveAnimationToLibrary(name: string, phases: import('@storyengine/shared').AnimationPhase[]) {
        try {
          const { saveAnimation } = await import('../lib/assetDb.js');
          const stored = {
            id: crypto.randomUUID(),
            name,
            phases,
            createdAt: Date.now(),
          };
          await saveAnimation(stored);
          const { listAnimations } = await import('../lib/assetDb.js');
          const lib = await listAnimations();
          set({ animationLibrary: lib });
        } catch (err) {
          logger.warn('Failed to save animation to library', { error: String(err) });
        }
      },

      async loadAnimationLibrary() {
        try {
          const { listAnimations } = await import('../lib/assetDb.js');
          const lib = await listAnimations();
          set({ animationLibrary: lib });
        } catch (err) {
          logger.warn('Failed to load animation library', { error: String(err) });
        }
      },

      async deleteAnimationFromLibrary(id: string) {
        try {
          const { deleteAnimationById } = await import('../lib/assetDb.js');
          await deleteAnimationById(id);
          const { listAnimations } = await import('../lib/assetDb.js');
          const lib = await listAnimations();
          set({ animationLibrary: lib });
        } catch (err) {
          logger.warn('Failed to delete animation from library', { error: String(err) });
        }
      },

      applyLibraryAnimation(animId: string, baseTileId: number) {
        const { animationLibrary, tileset, scene } = get();
        const stored = animationLibrary.find((a) => a.id === animId);
        if (!stored || !tileset) return;
        const animations = { ...tileset.ref.animations, [String(baseTileId)]: { phases: stored.phases } };
        const ref = { ...tileset.ref, animations };
        set({
          tileset: { ...tileset, ref },
          scene: { ...scene, tileset: ref },
        });
      },

      addGroupAnimation(name: string): string | null {
        const { scene, activeLayerIndex, selectionBounds } = get();
        if (!selectionBounds) return null;
        const { x1, y1, x2, y2 } = selectionBounds;
        const w = x2 - x1 + 1;
        const h = y2 - y1 + 1;
        const layer = scene.layers[activeLayerIndex];

        // Capture current tiles as frame 1
        const tiles: number[] = [];
        for (let y = y1; y <= y2; y++) {
          for (let x = x1; x <= x2; x++) {
            tiles.push(layer.data[y * scene.width + x]);
          }
        }

        const id = crypto.randomUUID();
        const group: import('@storyengine/shared').GroupAnimation = {
          id,
          name,
          x: x1,
          y: y1,
          width: w,
          height: h,
          phases: [{ frames: [{ tiles }], speed: 4 }],
          layer: activeLayerIndex,
        };

        const groups = [...(scene.groupAnimations ?? []), group];
        set({
          scene: { ...scene, groupAnimations: groups },
          selectionBounds: null,
          editingGroupAnimationId: id,
        });
        return id;
      },

      updateGroupAnimation(id: string, phases: import('@storyengine/shared').GroupAnimationPhase[]) {
        const { scene } = get();
        const groups = (scene.groupAnimations ?? []).map((g) =>
          g.id === id ? { ...g, phases } : g,
        );
        set({ scene: { ...scene, groupAnimations: groups } });
      },

      removeGroupAnimation(id: string) {
        const { scene } = get();
        const groups = (scene.groupAnimations ?? []).filter((g) => g.id !== id);
        set({
          scene: { ...scene, groupAnimations: groups.length > 0 ? groups : undefined },
          editingGroupAnimationId: null,
        });
      },

      captureGroupFrame(groupId: string) {
        const { scene, activeLayerIndex } = get();
        const groups = scene.groupAnimations ?? [];
        const group = groups.find((g) => g.id === groupId);
        if (!group) return;
        const layer = scene.layers[activeLayerIndex];

        const tiles: number[] = [];
        for (let y = group.y; y < group.y + group.height; y++) {
          for (let x = group.x; x < group.x + group.width; x++) {
            tiles.push(layer.data[y * scene.width + x]);
          }
        }

        // Add frame to the last phase
        const updatedGroups = groups.map((g) => {
          if (g.id !== groupId) return g;
          const phases = [...g.phases];
          const lastPhase = { ...phases[phases.length - 1] };
          lastPhase.frames = [...lastPhase.frames, { tiles }];
          phases[phases.length - 1] = lastPhase;
          return { ...g, phases };
        });
        set({ scene: { ...scene, groupAnimations: updatedGroups } });
      },

      selectEntityAt(x: number, y: number) {
        const { scene } = get();
        const entities = scene.entities ?? [];
        // Find entity at this tile position
        const found = entities.find((e) => {
          const ew = e.width ?? 1;
          const eh = e.height ?? 1;
          return x >= e.x && x < e.x + ew && y >= e.y && y < e.y + eh;
        });
        set({ selectedEntityId: found?.id ?? null });
      },

      setSelectedEntityId(id: string | null) {
        set({ selectedEntityId: id });
      },

      setBrushStamp(brush: import('../types/editor.js').BrushStamp | null) {
        set({ brushStamp: brush });
        if (brush) set({ activeTool: 'paint' as Tool });
      },

      stampBrush(x: number, y: number) {
        const { scene, activeLayerIndex, brushStamp, tileset } = get();
        if (!brushStamp) return;
        const layer = scene.layers[activeLayerIndex];
        const newData = [...layer.data];
        const newTransforms = cloneTransforms(layer, scene.width * scene.height);
        let changed = false;
        for (const bt of brushStamp.tiles) {
          const dx = x + bt.dx;
          const dy = y + bt.dy;
          if (dx < 0 || dx >= scene.width || dy < 0 || dy >= scene.height) continue;
          if (tileset && bt.tileId >= tileset.tileImages.length) continue;
          const idx = dy * scene.width + dx;
          if (newData[idx] !== bt.tileId || newTransforms[idx] !== 0) {
            newData[idx] = bt.tileId;
            newTransforms[idx] = 0;
            changed = true;
          }
        }
        if (!changed) return;
        const newLayer = { ...layer, data: newData, transforms: newTransforms };
        const newLayers = [...scene.layers];
        newLayers[activeLayerIndex] = newLayer;
        set({ scene: { ...scene, layers: newLayers } });
      },

      setEditorMode(mode: import('../types/editor.js').EditorMode) {
        set({
          editorMode: mode,
          selectionBounds: null,
          clipboard: null,
          brushStamp: null,
        });
        if (mode === 'game') set({ showCollisionOverlay: true });
      },

      setActiveGameTool(tool: import('../types/editor.js').GameTool) {
        set({ activeGameTool: tool });
      },

      toggleCollisionOverlay() {
        set((s) => ({ showCollisionOverlay: !s.showCollisionOverlay }));
      },

      paintCollision(x: number, y: number, blocked: boolean) {
        const { scene } = get();
        if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) return;
        const collision = scene.collisionLayer
          ? [...scene.collisionLayer]
          : new Array(scene.width * scene.height).fill(0);
        const val = blocked ? 1 : 0;
        const idx = y * scene.width + x;
        if (collision[idx] === val) return;
        collision[idx] = val;
        set({ scene: { ...scene, collisionLayer: collision } });
      },

      setSpawnPoint(x: number, y: number) {
        const { scene } = get();
        const entities = (scene.entities ?? []).filter((e) => e.type !== 'spawn');
        entities.push({ id: crypto.randomUUID(), type: 'spawn', x, y });
        set({ scene: { ...scene, entities } });
      },

      addExitZone(x1: number, y1: number, x2: number, y2: number) {
        const { scene } = get();
        const entities = [...(scene.entities ?? [])];
        entities.push({
          id: crypto.randomUUID(),
          type: 'exit',
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.abs(x2 - x1) + 1,
          height: Math.abs(y2 - y1) + 1,
          properties: {},
        });
        set({ scene: { ...scene, entities } });
      },

      addNpc(x: number, y: number) {
        const { scene } = get();
        const entities = [...(scene.entities ?? [])];
        entities.push({
          id: crypto.randomUUID(),
          type: 'npc',
          x,
          y,
          properties: { name: 'NPC', dialogue: [] },
        });
        set({ scene: { ...scene, entities } });
      },

      addAction(x: number, y: number) {
        const { scene } = get();
        const entities = [...(scene.entities ?? [])];
        entities.push({
          id: crypto.randomUUID(),
          type: 'action',
          x,
          y,
          properties: {
            action: {
              trigger: 'interact',
              steps: [],
              oneShot: false,
            },
          },
        });
        set({ scene: { ...scene, entities } });
      },

      removeEntity(id: string) {
        const { scene } = get();
        const entities = (scene.entities ?? []).filter((e) => e.id !== id);
        set({ scene: { ...scene, entities: entities.length > 0 ? entities : undefined } });
      },

      updateEntity(id: string, patch: Partial<import('@storyengine/shared').EntityDef>) {
        const { scene } = get();
        const entities = (scene.entities ?? []).map((e) =>
          e.id === id ? { ...e, ...patch } : e,
        );
        set({ scene: { ...scene, entities } });
      },

      validateScene(): import('../types/editor.js').ValidationMessage[] {
        const { scene } = get();
        const messages: import('../types/editor.js').ValidationMessage[] = [];
        const entities = scene.entities ?? [];

        const spawns = entities.filter((e) => e.type === 'spawn');
        if (spawns.length === 0) {
          messages.push({ level: 'error', message: 'No player spawn point defined' });
        }
        if (spawns.length > 1) {
          messages.push({ level: 'warn', message: 'Multiple spawn points — only the first will be used' });
        }

        const exits = entities.filter((e) => e.type === 'exit');
        for (const exit of exits) {
          if (!exit.properties?.targetSceneId) {
            messages.push({ level: 'error', message: `Exit at (${exit.x},${exit.y}) has no target scene` });
          }
        }

        const npcs = entities.filter((e) => e.type === 'npc');
        for (const npc of npcs) {
          const dialogue = npc.properties?.dialogue as unknown[];
          if (!dialogue || !Array.isArray(dialogue) || dialogue.length === 0) {
            messages.push({ level: 'warn', message: `NPC "${npc.properties?.name ?? 'unnamed'}" at (${npc.x},${npc.y}) has no dialogue` });
          }
        }

        if (!scene.collisionLayer) {
          messages.push({ level: 'warn', message: 'No collision layer defined — all tiles are walkable' });
        }

        return messages;
      },

      async paintColor(x: number, y: number) {
        const { scene, activeLayerIndex, tileset, currentColor, colorTileMap, currentRotation, currentFlipH, currentFlipV } = get();
        if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) return;

        const ts = scene.tileSize;

        // Check if we already have a tile for this color
        const existingIdx = colorTileMap[currentColor];
        if (existingIdx !== undefined && tileset && existingIdx < tileset.tileImages.length) {
          // Reuse existing color tile
          const idx = y * scene.width + x;
          const layer = scene.layers[activeLayerIndex];
          const transformVal = encodeTransform(currentRotation, currentFlipH, currentFlipV);
          if (layer.data[idx] === existingIdx && (layer.transforms?.[idx] ?? 0) === transformVal) return;
          const newData = [...layer.data];
          newData[idx] = existingIdx;
          const newTransforms = cloneTransforms(layer, scene.width * scene.height);
          newTransforms[idx] = transformVal;
          const newLayer = { ...layer, data: newData, transforms: newTransforms };
          const newLayers = [...scene.layers];
          newLayers[activeLayerIndex] = newLayer;
          set({ scene: { ...scene, layers: newLayers } });
          return;
        }

        // Create a new solid-color tile
        const canvas = new OffscreenCanvas(ts, ts);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = currentColor;
        ctx.fillRect(0, 0, ts, ts);
        const bmp = await createImageBitmap(canvas);

        const oldTileImages = tileset?.tileImages ?? [];
        const newTileImages = [...oldTileImages, bmp];
        const newTileIdx = newTileImages.length - 1;
        const columns = Math.min(newTileImages.length, 8);
        const ref = tileset?.ref
          ? { ...tileset.ref, columns }
          : { name: 'color-tiles', tileSize: ts, image: '', columns };

        const newTileset: TilesetState = {
          ref,
          imageDataUrl: tileset?.imageDataUrl ?? '',
          tileImages: newTileImages,
        };

        const idx = y * scene.width + x;
        const layer = scene.layers[activeLayerIndex];
        const newData = [...layer.data];
        newData[idx] = newTileIdx;
        const transformVal = encodeTransform(currentRotation, currentFlipH, currentFlipV);
        const newTransforms = cloneTransforms(layer, scene.width * scene.height);
        newTransforms[idx] = transformVal;
        const newLayer = { ...layer, data: newData, transforms: newTransforms };
        const newLayers = [...scene.layers];
        newLayers[activeLayerIndex] = newLayer;

        set({
          tileset: newTileset,
          scene: { ...scene, layers: newLayers, tileset: ref },
          colorTileMap: { ...colorTileMap, [currentColor]: newTileIdx },
        });
      },

      async autoTileImage(image: HTMLImageElement, tileSize: number) {
        try {
          const { autoTileImage: autoTile } = await import('../lib/autoTiler.js');
          const result = await autoTile(image, tileSize);

          const columns = Math.min(result.uniqueTiles.length, 16);
          const ref = { name: 'auto-tiled', tileSize, image: '', columns };
          const newTileset: TilesetState = {
            ref,
            imageDataUrl: '',
            tileImages: result.uniqueTiles,
          };

          // Resize scene to match the image grid
          const newLayer: TileLayer = {
            name: 'auto-tiled',
            data: result.tileMap,
            transforms: new Array(result.columns * result.rows).fill(0),
          };

          const newScene: SceneJSON = {
            version: 1,
            width: result.columns,
            height: result.rows,
            tileSize,
            layers: [newLayer, {
              name: 'overlay',
              data: new Array(result.columns * result.rows).fill(-1),
            }],
            tileset: ref,
          };

          set({
            tileset: newTileset,
            scene: newScene,
            selectedTileId: 0,
            activeLayerIndex: 0,
            layerVisibility: [true, true],
            clipboard: null,
            selectionBounds: null,
            colorTileMap: {},
          });

          const total = result.columns * result.rows;
          const unique = result.uniqueTiles.length;
          const pct = Math.round((1 - unique / total) * 100);
          logger.info('Auto-tiled image', {
            total, unique, reduction: `${pct}%`,
            gridSize: `${result.columns}x${result.rows}`,
          });

          return { total, unique, pct };
        } catch (err) {
          logger.warn('Auto-tile failed', { error: String(err) });
          throw err;
        }
      },

      ...createCollectionActions(set, get),
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
