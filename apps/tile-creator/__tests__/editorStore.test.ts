import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore, createDefaultScene } from '../src/store/editorStore.js';

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
});
