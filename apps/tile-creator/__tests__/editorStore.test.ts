import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore, createDefaultScene } from '../src/store/editorStore.js';
import { encodeTransform, decodeTransform } from '../src/lib/transformUtils.js';

function resetStore() {
  useEditorStore.setState({
    scene: createDefaultScene(),
    activeTool: 'paint',
    selectedTileId: -1,
    activeLayerIndex: 0,
    layerVisibility: [true, true, true],
    zoom: 2,
    tileset: null,
    currentRotation: 0,
    currentFlipH: false,
    currentFlipV: false,
    tilesetLibrary: [],
    currentTilesetId: null,
    currentCollection: null,
    currentSceneId: null,
    selectionBounds: null,
    clipboard: null,
    prefabLibrary: [],
    currentColor: '#a6e3a1',
    colorTileMap: {},
    animClock: 0,
    animationLibrary: [],
    editingGroupAnimationId: null,
    editorMode: 'art',
    activeGameTool: 'collision',
    showCollisionOverlay: false,
  });
  useEditorStore.temporal.getState().clear();
}

describe('editorStore', () => {
  beforeEach(resetStore);

  describe('paintTile', () => {
    it('sets tile at correct position', () => {
      const { setSelectedTile, paintTile } = useEditorStore.getState();
      setSelectedTile(5);
      paintTile(3, 2);
      const { scene } = useEditorStore.getState();
      expect(scene.layers[0].data[2 * scene.width + 3]).toBe(5);
    });

    it('does nothing with no tile selected', () => {
      const { paintTile } = useEditorStore.getState();
      paintTile(0, 0);
      const { scene } = useEditorStore.getState();
      expect(scene.layers[0].data[0]).toBe(-1);
    });

    it('ignores out-of-bounds coordinates', () => {
      const { setSelectedTile, paintTile } = useEditorStore.getState();
      setSelectedTile(1);
      paintTile(-1, 0);
      paintTile(999, 0);
      const { scene } = useEditorStore.getState();
      expect(scene.layers[0].data.every((t) => t === -1)).toBe(true);
    });

    it('skips if tile already matches', () => {
      const { setSelectedTile, paintTile } = useEditorStore.getState();
      setSelectedTile(3);
      paintTile(0, 0);
      const sceneBefore = useEditorStore.getState().scene;
      paintTile(0, 0);
      const sceneAfter = useEditorStore.getState().scene;
      expect(sceneBefore).toBe(sceneAfter);
    });
  });

  describe('eraseTile', () => {
    it('sets tile to -1', () => {
      const { setSelectedTile, paintTile, eraseTile } = useEditorStore.getState();
      setSelectedTile(5);
      paintTile(1, 1);
      eraseTile(1, 1);
      const { scene } = useEditorStore.getState();
      expect(scene.layers[0].data[1 * scene.width + 1]).toBe(-1);
    });

    it('skips if already empty', () => {
      const sceneBefore = useEditorStore.getState().scene;
      useEditorStore.getState().eraseTile(0, 0);
      const sceneAfter = useEditorStore.getState().scene;
      expect(sceneBefore).toBe(sceneAfter);
    });
  });

  describe('layer operations', () => {
    it('adds a layer', () => {
      useEditorStore.getState().addLayer('test');
      const { scene, layerVisibility } = useEditorStore.getState();
      expect(scene.layers).toHaveLength(4);
      expect(scene.layers[3].name).toBe('test');
      expect(layerVisibility).toHaveLength(4);
      expect(layerVisibility[3]).toBe(true);
    });

    it('removes a layer', () => {
      useEditorStore.getState().removeLayer(1);
      const { scene } = useEditorStore.getState();
      expect(scene.layers).toHaveLength(2);
      expect(scene.layers[0].name).toBe('background');
      expect(scene.layers[1].name).toBe('foreground');
    });

    it('does not remove last layer', () => {
      useEditorStore.getState().removeLayer(0);
      useEditorStore.getState().removeLayer(0);
      const { scene } = useEditorStore.getState();
      expect(scene.layers).toHaveLength(1);
      useEditorStore.getState().removeLayer(0);
      expect(useEditorStore.getState().scene.layers).toHaveLength(1);
    });

    it('clamps activeLayerIndex on remove', () => {
      useEditorStore.getState().setActiveLayer(2);
      useEditorStore.getState().removeLayer(2);
      expect(useEditorStore.getState().activeLayerIndex).toBe(1);
    });

    it('moves layer up', () => {
      useEditorStore.getState().moveLayer(2, 0);
      const names = useEditorStore.getState().scene.layers.map((l) => l.name);
      expect(names).toEqual(['foreground', 'background', 'midground']);
    });

    it('renames a layer', () => {
      useEditorStore.getState().renameLayer(0, 'ground');
      expect(useEditorStore.getState().scene.layers[0].name).toBe('ground');
    });

    it('toggles layer visibility', () => {
      useEditorStore.getState().toggleLayerVisibility(1);
      expect(useEditorStore.getState().layerVisibility[1]).toBe(false);
      useEditorStore.getState().toggleLayerVisibility(1);
      expect(useEditorStore.getState().layerVisibility[1]).toBe(true);
    });

    it('tracks activeLayerIndex when moving the active layer down', () => {
      useEditorStore.getState().setActiveLayer(0);
      useEditorStore.getState().moveLayer(0, 2);
      expect(useEditorStore.getState().activeLayerIndex).toBe(2);
      expect(useEditorStore.getState().scene.layers[2].name).toBe('background');
    });

    it('tracks activeLayerIndex when moving the active layer up', () => {
      useEditorStore.getState().setActiveLayer(2);
      useEditorStore.getState().moveLayer(2, 0);
      expect(useEditorStore.getState().activeLayerIndex).toBe(0);
      expect(useEditorStore.getState().scene.layers[0].name).toBe('foreground');
    });

    it('adjusts activeLayerIndex when layer below active moves above', () => {
      useEditorStore.getState().setActiveLayer(1);
      useEditorStore.getState().moveLayer(0, 2);
      expect(useEditorStore.getState().activeLayerIndex).toBe(0);
    });

    it('adjusts activeLayerIndex when layer above active moves below', () => {
      useEditorStore.getState().setActiveLayer(1);
      useEditorStore.getState().moveLayer(2, 0);
      expect(useEditorStore.getState().activeLayerIndex).toBe(2);
    });
  });

  describe('undo/redo', () => {
    it('undoes a paint operation', () => {
      const { setSelectedTile, paintTile } = useEditorStore.getState();
      setSelectedTile(1);
      paintTile(0, 0);
      expect(useEditorStore.getState().scene.layers[0].data[0]).toBe(1);

      useEditorStore.temporal.getState().undo();
      expect(useEditorStore.getState().scene.layers[0].data[0]).toBe(-1);
    });

    it('redoes after undo', () => {
      const { setSelectedTile, paintTile } = useEditorStore.getState();
      setSelectedTile(2);
      paintTile(0, 0);
      useEditorStore.temporal.getState().undo();
      useEditorStore.temporal.getState().redo();
      expect(useEditorStore.getState().scene.layers[0].data[0]).toBe(2);
    });

    it('supports 50+ undo steps', () => {
      const { setSelectedTile, paintTile } = useEditorStore.getState();
      setSelectedTile(1);

      for (let i = 0; i < 60; i++) {
        paintTile(i % 20, Math.floor(i / 20));
      }

      for (let i = 0; i < 60; i++) {
        useEditorStore.temporal.getState().undo();
      }

      const allEmpty = useEditorStore.getState().scene.layers[0].data.every(
        (t) => t === -1,
      );
      expect(allEmpty).toBe(true);
    });

    it('does not track UI-only changes', () => {
      const pastLen = () =>
        useEditorStore.temporal.getState().pastStates.length;
      const before = pastLen();
      useEditorStore.getState().setActiveTool('erase');
      useEditorStore.getState().setSelectedTile(5);
      useEditorStore.getState().setZoom(3);
      expect(pastLen()).toBe(before);
    });
  });

  describe('loadScene', () => {
    it('replaces entire scene', () => {
      const newScene = {
        ...createDefaultScene(),
        width: 10,
        height: 5,
        layers: [{ name: 'only', data: new Array(50).fill(0) }],
      };
      useEditorStore.getState().loadScene(newScene);
      const state = useEditorStore.getState();
      expect(state.scene.width).toBe(10);
      expect(state.scene.layers).toHaveLength(1);
      expect(state.activeLayerIndex).toBe(0);
      expect(state.layerVisibility).toEqual([true]);
    });
  });

  describe('zoom', () => {
    it('clamps between 1 and 8', () => {
      useEditorStore.getState().setZoom(0);
      expect(useEditorStore.getState().zoom).toBe(1);
      useEditorStore.getState().setZoom(10);
      expect(useEditorStore.getState().zoom).toBe(8);
    });
  });

  describe('tile rotation', () => {
    it('paintTile writes currentRotation to transforms', () => {
      const { setSelectedTile, setRotation, paintTile } = useEditorStore.getState();
      setSelectedTile(1);
      setRotation(2);
      paintTile(3, 2);
      const layer = useEditorStore.getState().scene.layers[0];
      const idx = 2 * 20 + 3;
      expect(layer.transforms?.[idx]).toBe(2);
    });

    it('eraseTile resets transform to 0', () => {
      const { setSelectedTile, setRotation, paintTile, eraseTile } = useEditorStore.getState();
      setSelectedTile(1);
      setRotation(3);
      paintTile(0, 0);
      eraseTile(0, 0);
      const layer = useEditorStore.getState().scene.layers[0];
      expect(layer.transforms?.[0]).toBe(0);
    });

    it('rotateTileAt cycles 0 -> 1 -> 2 -> 3 -> 0', () => {
      const { setSelectedTile, paintTile, rotateTileAt } = useEditorStore.getState();
      setSelectedTile(1);
      paintTile(0, 0);
      for (let expected = 1; expected <= 4; expected++) {
        rotateTileAt(0, 0);
        const layer = useEditorStore.getState().scene.layers[0];
        expect(layer.transforms?.[0]).toBe(expected % 4);
      }
    });

    it('setRotation wraps negative values', () => {
      useEditorStore.getState().setRotation(-1);
      expect(useEditorStore.getState().currentRotation).toBe(3);
    });

    it('rotateTileAt does nothing on empty tile', () => {
      const sceneBefore = useEditorStore.getState().scene;
      useEditorStore.getState().rotateTileAt(0, 0);
      expect(useEditorStore.getState().scene).toBe(sceneBefore);
    });
  });

  describe('selection/stamp', () => {
    it('selectArea normalizes coordinates', () => {
      useEditorStore.getState().selectArea(5, 3, 2, 1);
      const bounds = useEditorStore.getState().selectionBounds;
      expect(bounds).toEqual({ x1: 2, y1: 1, x2: 5, y2: 3 });
    });

    it('selectArea clamps to scene bounds', () => {
      useEditorStore.getState().selectArea(-5, -5, 100, 100);
      const bounds = useEditorStore.getState().selectionBounds;
      expect(bounds).toEqual({ x1: 0, y1: 0, x2: 19, y2: 10 });
    });

    it('copySelection captures tiles from active layer', () => {
      const { setSelectedTile, paintTile } = useEditorStore.getState();
      setSelectedTile(3);
      paintTile(1, 1);
      paintTile(2, 1);
      useEditorStore.getState().selectArea(1, 1, 2, 1);
      useEditorStore.getState().copySelection();
      const clip = useEditorStore.getState().clipboard;
      expect(clip).not.toBeNull();
      expect(clip!.width).toBe(2);
      expect(clip!.height).toBe(1);
      expect(clip!.tiles).toEqual([3, 3]);
    });

    it('stampClipboard writes at destination', () => {
      const { setSelectedTile, paintTile } = useEditorStore.getState();
      setSelectedTile(7);
      paintTile(0, 0);
      useEditorStore.getState().selectArea(0, 0, 0, 0);
      useEditorStore.getState().copySelection();
      useEditorStore.getState().stampClipboard(5, 5);
      const { scene } = useEditorStore.getState();
      expect(scene.layers[0].data[5 * scene.width + 5]).toBe(7);
    });

    it('stampClipboard skips empty tiles', () => {
      useEditorStore.getState().selectArea(0, 0, 1, 0);
      useEditorStore.getState().copySelection();
      const { setSelectedTile, paintTile } = useEditorStore.getState();
      setSelectedTile(9);
      paintTile(3, 3);
      useEditorStore.getState().stampClipboard(3, 3);
      const { scene } = useEditorStore.getState();
      expect(scene.layers[0].data[3 * scene.width + 3]).toBe(9);
    });

    it('clearSelection resets both fields', () => {
      useEditorStore.getState().selectArea(0, 0, 2, 2);
      useEditorStore.getState().copySelection();
      expect(useEditorStore.getState().selectionBounds).not.toBeNull();
      expect(useEditorStore.getState().clipboard).not.toBeNull();
      useEditorStore.getState().clearSelection();
      expect(useEditorStore.getState().selectionBounds).toBeNull();
      expect(useEditorStore.getState().clipboard).toBeNull();
    });

    it('eraseSelection clears all tiles in selected area', () => {
      const { setSelectedTile, paintTile } = useEditorStore.getState();
      setSelectedTile(3);
      paintTile(1, 1);
      paintTile(2, 1);
      paintTile(1, 2);
      paintTile(2, 2);
      useEditorStore.getState().selectArea(1, 1, 2, 2);
      useEditorStore.getState().eraseSelection();
      const { scene } = useEditorStore.getState();
      expect(scene.layers[0].data[1 * scene.width + 1]).toBe(-1);
      expect(scene.layers[0].data[1 * scene.width + 2]).toBe(-1);
      expect(scene.layers[0].data[2 * scene.width + 1]).toBe(-1);
      expect(scene.layers[0].data[2 * scene.width + 2]).toBe(-1);
      expect(useEditorStore.getState().selectionBounds).toBeNull();
    });

    it('stamp works across layers', () => {
      const { setSelectedTile, paintTile, setActiveLayer, addLayer } = useEditorStore.getState();
      setSelectedTile(5);
      paintTile(0, 0);
      useEditorStore.getState().selectArea(0, 0, 0, 0);
      useEditorStore.getState().copySelection();
      addLayer('target');
      const layerCount = useEditorStore.getState().scene.layers.length;
      setActiveLayer(layerCount - 1);
      useEditorStore.getState().stampClipboard(3, 3);
      const { scene } = useEditorStore.getState();
      const targetLayer = scene.layers[layerCount - 1];
      expect(targetLayer.data[3 * scene.width + 3]).toBe(5);
      // Source layer unchanged at (3,3)
      expect(scene.layers[0].data[3 * scene.width + 3]).toBe(-1);
    });
  });

  describe('transformUtils', () => {
    it('encodeTransform/decodeTransform roundtrip', () => {
      const encoded = encodeTransform(2, true, false);
      const decoded = decodeTransform(encoded);
      expect(decoded).toEqual({ rotation: 2, flipH: true, flipV: false });
    });

    it('backward compatible with old 0-3 values', () => {
      expect(decodeTransform(0)).toEqual({ rotation: 0, flipH: false, flipV: false });
      expect(decodeTransform(1)).toEqual({ rotation: 1, flipH: false, flipV: false });
      expect(decodeTransform(2)).toEqual({ rotation: 2, flipH: false, flipV: false });
      expect(decodeTransform(3)).toEqual({ rotation: 3, flipH: false, flipV: false });
    });

    it('encodes all combinations', () => {
      const encoded = encodeTransform(1, true, true);
      expect(decodeTransform(encoded)).toEqual({ rotation: 1, flipH: true, flipV: true });
    });
  });

  describe('flip', () => {
    it('paintTile encodes flip state', () => {
      const { setSelectedTile, paintTile } = useEditorStore.getState();
      useEditorStore.setState({ currentFlipH: true, currentFlipV: false, currentRotation: 0 });
      setSelectedTile(2);
      paintTile(1, 1);
      const layer = useEditorStore.getState().scene.layers[0];
      const idx = 1 * 20 + 1;
      const decoded = decodeTransform(layer.transforms![idx]);
      expect(decoded.flipH).toBe(true);
      expect(decoded.flipV).toBe(false);
      expect(decoded.rotation).toBe(0);
    });

    it('toggleFlipH toggles state', () => {
      expect(useEditorStore.getState().currentFlipH).toBe(false);
      useEditorStore.getState().toggleFlipH();
      expect(useEditorStore.getState().currentFlipH).toBe(true);
      useEditorStore.getState().toggleFlipH();
      expect(useEditorStore.getState().currentFlipH).toBe(false);
    });

    it('flipTileAt toggles flip on placed tile', () => {
      const { setSelectedTile, paintTile } = useEditorStore.getState();
      setSelectedTile(3);
      paintTile(2, 2);
      useEditorStore.getState().flipTileAt(2, 2, 'h');
      const layer = useEditorStore.getState().scene.layers[0];
      const idx = 2 * 20 + 2;
      const decoded = decodeTransform(layer.transforms![idx]);
      expect(decoded.flipH).toBe(true);
      expect(decoded.flipV).toBe(false);
    });

    it('flipTileAt does nothing on empty tile', () => {
      const sceneBefore = useEditorStore.getState().scene;
      useEditorStore.getState().flipTileAt(0, 0, 'v');
      expect(useEditorStore.getState().scene).toBe(sceneBefore);
    });
  });

  describe('setTileset reset', () => {
    it('resets selectedTileId and clipboard on tileset change', () => {
      useEditorStore.setState({ selectedTileId: 50, clipboard: { width: 1, height: 1, tiles: [5], transforms: [0] } });
      useEditorStore.getState().setTileset({
        ref: { name: 'test', tileSize: 16, image: 'test.png', columns: 4 },
        imageDataUrl: '',
        tileImages: [],
      });
      expect(useEditorStore.getState().selectedTileId).toBe(0);
      expect(useEditorStore.getState().clipboard).toBeNull();
      expect(useEditorStore.getState().selectionBounds).toBeNull();
    });
  });

  describe('color paint', () => {
    it('setColor updates currentColor', () => {
      useEditorStore.getState().setColor('#ff0000');
      expect(useEditorStore.getState().currentColor).toBe('#ff0000');
    });

    it('tool type includes colorPaint', () => {
      useEditorStore.getState().setActiveTool('colorPaint');
      expect(useEditorStore.getState().activeTool).toBe('colorPaint');
    });
  });

  describe('tile animation', () => {
    beforeEach(() => {
      useEditorStore.getState().setTileset({
        ref: { name: 'test', tileSize: 16, image: 'test.png', columns: 4 },
        imageDataUrl: '',
        tileImages: [],
      });
    });

    it('setTileAnimation adds phased animation to tileset ref', () => {
      useEditorStore.getState().setTileAnimation(0, [{ frames: [0, 1, 2, 1], speed: 4 }]);
      const anim = useEditorStore.getState().tileset?.ref.animations?.['0'];
      expect(anim).toEqual({ phases: [{ frames: [0, 1, 2, 1], speed: 4 }] });
    });

    it('setTileAnimation persists to scene.tileset', () => {
      useEditorStore.getState().setTileAnimation(3, [{ frames: [3, 4], speed: 8 }]);
      const sceneAnim = useEditorStore.getState().scene.tileset.animations?.['3'];
      expect(sceneAnim).toEqual({ phases: [{ frames: [3, 4], speed: 8 }] });
    });

    it('setTileAnimation supports multiple phases with loops', () => {
      useEditorStore.getState().setTileAnimation(0, [
        { frames: [0, 1, 2], speed: 4, loops: 5 },
        { frames: [3, 4], speed: 2, loops: 3 },
        { frames: [5], speed: 1 },
      ]);
      const anim = useEditorStore.getState().tileset?.ref.animations?.['0'];
      expect(anim?.phases).toHaveLength(3);
      expect(anim?.phases[0].loops).toBe(5);
      expect(anim?.phases[2].loops).toBeUndefined();
    });

    it('removeTileAnimation removes animation', () => {
      useEditorStore.getState().setTileAnimation(0, [{ frames: [0, 1], speed: 4 }]);
      expect(useEditorStore.getState().tileset?.ref.animations?.['0']).toBeDefined();
      useEditorStore.getState().removeTileAnimation(0);
      expect(useEditorStore.getState().tileset?.ref.animations).toBeUndefined();
    });

    it('removeTileAnimation keeps other animations', () => {
      useEditorStore.getState().setTileAnimation(0, [{ frames: [0, 1], speed: 4 }]);
      useEditorStore.getState().setTileAnimation(2, [{ frames: [2, 3], speed: 6 }]);
      useEditorStore.getState().removeTileAnimation(0);
      expect(useEditorStore.getState().tileset?.ref.animations?.['0']).toBeUndefined();
      expect(useEditorStore.getState().tileset?.ref.animations?.['2']).toEqual({
        phases: [{ frames: [2, 3], speed: 6 }],
      });
    });

    it('tickAnimation increments animClock', () => {
      expect(useEditorStore.getState().animClock).toBe(0);
      useEditorStore.getState().tickAnimation();
      expect(useEditorStore.getState().animClock).toBe(250);
      useEditorStore.getState().tickAnimation();
      expect(useEditorStore.getState().animClock).toBe(500);
    });
  });

  describe('group animation', () => {
    it('addGroupAnimation captures tiles from selection', () => {
      const { setSelectedTile, paintTile, selectArea } = useEditorStore.getState();
      setSelectedTile(5);
      paintTile(0, 0);
      paintTile(1, 0);
      paintTile(0, 1);
      paintTile(1, 1);
      selectArea(0, 0, 1, 1);
      const id = useEditorStore.getState().addGroupAnimation('bookcase');
      expect(id).not.toBeNull();
      const groups = useEditorStore.getState().scene.groupAnimations;
      expect(groups).toHaveLength(1);
      expect(groups![0].width).toBe(2);
      expect(groups![0].height).toBe(2);
      expect(groups![0].phases[0].frames[0].tiles).toEqual([5, 5, 5, 5]);
      expect(groups![0].name).toBe('bookcase');
    });

    it('captureGroupFrame adds a frame to the last phase', () => {
      const { setSelectedTile, paintTile, selectArea } = useEditorStore.getState();
      setSelectedTile(1);
      paintTile(0, 0);
      paintTile(1, 0);
      selectArea(0, 0, 1, 0);
      const id = useEditorStore.getState().addGroupAnimation('test');
      expect(id).not.toBeNull();

      // Paint different tiles and capture
      setSelectedTile(9);
      paintTile(0, 0);
      paintTile(1, 0);
      useEditorStore.getState().captureGroupFrame(id!);

      const groups = useEditorStore.getState().scene.groupAnimations!;
      expect(groups[0].phases[0].frames).toHaveLength(2);
      expect(groups[0].phases[0].frames[1].tiles).toEqual([9, 9]);
    });

    it('removeGroupAnimation deletes group', () => {
      const { setSelectedTile, paintTile, selectArea } = useEditorStore.getState();
      setSelectedTile(1);
      paintTile(0, 0);
      selectArea(0, 0, 0, 0);
      const id = useEditorStore.getState().addGroupAnimation('test');
      expect(useEditorStore.getState().scene.groupAnimations).toHaveLength(1);
      useEditorStore.getState().removeGroupAnimation(id!);
      expect(useEditorStore.getState().scene.groupAnimations).toBeUndefined();
    });

    it('updateGroupAnimation updates phases', () => {
      const { setSelectedTile, paintTile, selectArea } = useEditorStore.getState();
      setSelectedTile(1);
      paintTile(0, 0);
      selectArea(0, 0, 0, 0);
      const id = useEditorStore.getState().addGroupAnimation('test');
      useEditorStore.getState().updateGroupAnimation(id!, [
        { frames: [{ tiles: [1] }, { tiles: [2] }], speed: 8 },
      ]);
      const group = useEditorStore.getState().scene.groupAnimations![0];
      expect(group.phases[0].speed).toBe(8);
      expect(group.phases[0].frames).toHaveLength(2);
    });
  });

  describe('game mode', () => {
    it('setEditorMode switches mode and enables collision overlay', () => {
      useEditorStore.getState().setEditorMode('game');
      expect(useEditorStore.getState().editorMode).toBe('game');
      expect(useEditorStore.getState().showCollisionOverlay).toBe(true);
    });

    it('paintCollision sets and unsets collision data', () => {
      useEditorStore.getState().paintCollision(0, 0, true);
      expect(useEditorStore.getState().scene.collisionLayer?.[0]).toBe(1);
      useEditorStore.getState().paintCollision(0, 0, false);
      expect(useEditorStore.getState().scene.collisionLayer?.[0]).toBe(0);
    });

    it('setSpawnPoint places spawn entity and replaces previous', () => {
      useEditorStore.getState().setSpawnPoint(5, 3);
      const ents1 = useEditorStore.getState().scene.entities!;
      expect(ents1).toHaveLength(1);
      expect(ents1[0].type).toBe('spawn');
      expect(ents1[0].x).toBe(5);
      // Setting again replaces
      useEditorStore.getState().setSpawnPoint(2, 1);
      const ents2 = useEditorStore.getState().scene.entities!;
      expect(ents2).toHaveLength(1);
      expect(ents2[0].x).toBe(2);
    });

    it('addExitZone creates exit entity with dimensions', () => {
      useEditorStore.getState().addExitZone(0, 0, 2, 1);
      const ents = useEditorStore.getState().scene.entities!;
      const exit = ents.find((e) => e.type === 'exit');
      expect(exit).toBeDefined();
      expect(exit!.width).toBe(3);
      expect(exit!.height).toBe(2);
    });

    it('addNpc creates npc entity', () => {
      useEditorStore.getState().addNpc(10, 5);
      const ents = useEditorStore.getState().scene.entities!;
      const npc = ents.find((e) => e.type === 'npc');
      expect(npc).toBeDefined();
      expect(npc!.x).toBe(10);
      expect(npc!.properties?.name).toBe('NPC');
    });

    it('removeEntity deletes entity', () => {
      useEditorStore.getState().addNpc(0, 0);
      const ents = useEditorStore.getState().scene.entities!;
      expect(ents.length).toBeGreaterThan(0);
      useEditorStore.getState().removeEntity(ents[ents.length - 1].id);
    });

    it('validateScene reports missing spawn', () => {
      const msgs = useEditorStore.getState().validateScene();
      expect(msgs.some((m) => m.message.includes('spawn'))).toBe(true);
    });

    it('addAction creates action entity', () => {
      useEditorStore.getState().addAction(3, 7);
      const ents = useEditorStore.getState().scene.entities!;
      const action = ents.find((e) => e.type === 'action');
      expect(action).toBeDefined();
      expect(action!.x).toBe(3);
      expect(action!.y).toBe(7);
      expect((action!.properties?.action as any)?.trigger).toBe('interact');
      expect((action!.properties?.action as any)?.steps).toEqual([]);
    });

    it('validateScene reports exit without target', () => {
      useEditorStore.getState().addExitZone(0, 0, 0, 0);
      const msgs = useEditorStore.getState().validateScene();
      expect(msgs.some((m) => m.message.includes('no target scene'))).toBe(true);
    });
  });
});
