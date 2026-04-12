import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LIGHTHOUSE_COLLECTION_ID } from '../src/lib/sampleCollections/lighthouse.js';
import { isSpawn, isNpc, isExit, isAction } from '@storyengine/shared';

// The sample generator uses HTMLCanvasElement for pixel art. Node doesn't
// provide one, so we stub a minimal canvas that returns a placeholder
// data URL — enough to exercise the bundle *structure*, which is what
// matters for tests. Visual correctness is verified manually in the browser.
beforeEach(() => {
  const stubContext = {
    imageSmoothingEnabled: false,
    fillStyle: '',
    fillRect: () => { /* no-op */ },
    save: () => { /* no-op */ },
    restore: () => { /* no-op */ },
    translate: () => { /* no-op */ },
  };
  const stubCanvas = {
    width: 0, height: 0,
    getContext: () => stubContext,
    toDataURL: () => 'data:image/png;base64,STUB',
  } as unknown as HTMLCanvasElement;
  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag === 'canvas') return stubCanvas;
      throw new Error(`Unsupported element: ${tag}`);
    },
  });
});

describe('generateLighthouseBundle', () => {
  it('produces a valid CollectionBundle v3', async () => {
    const { generateLighthouseBundle } = await import('../src/lib/sampleCollections/lighthouse.js');
    const bundle = generateLighthouseBundle();
    expect(bundle.kind).toBe('collection-bundle');
    expect(bundle.version).toBe(3);
    expect(bundle.collection.id).toBe(LIGHTHOUSE_COLLECTION_ID);
    expect(bundle.collection.name).toBe('The Lighthouse');
  });

  it('includes exactly one tileset and one sprite sheet', async () => {
    const { generateLighthouseBundle } = await import('../src/lib/sampleCollections/lighthouse.js');
    const bundle = generateLighthouseBundle();
    expect(Object.keys(bundle.tilesets)).toHaveLength(1);
    expect(Object.keys(bundle.spriteSheets)).toHaveLength(1);
  });

  it('has two scenes named Cliffside and Lighthouse Top', async () => {
    const { generateLighthouseBundle } = await import('../src/lib/sampleCollections/lighthouse.js');
    const bundle = generateLighthouseBundle();
    expect(bundle.collection.scenes).toHaveLength(2);
    const names = bundle.collection.scenes.map((s) => s.name);
    expect(names).toContain('Cliffside');
    expect(names).toContain('Lighthouse Top');
  });

  it('Cliffside scene has spawn, NPC with dialogue, and an exit', async () => {
    const { generateLighthouseBundle } = await import('../src/lib/sampleCollections/lighthouse.js');
    const bundle = generateLighthouseBundle();
    const cliffside = bundle.collection.scenes.find((s) => s.name === 'Cliffside')!;
    const entities = cliffside.scene.entities ?? [];
    expect(entities.filter(isSpawn).length).toBe(1);
    const npcs = entities.filter(isNpc);
    expect(npcs.length).toBe(1);
    expect(npcs[0].properties?.dialogue?.length).toBeGreaterThan(0);
    expect(entities.filter(isExit).length).toBe(1);
  });

  it('Lighthouse Top scene has a step-trigger action ending in endAdventure', async () => {
    const { generateLighthouseBundle } = await import('../src/lib/sampleCollections/lighthouse.js');
    const bundle = generateLighthouseBundle();
    const top = bundle.collection.scenes.find((s) => s.name === 'Lighthouse Top')!;
    const actions = (top.scene.entities ?? []).filter(isAction);
    expect(actions.length).toBeGreaterThan(0);
    const endingAction = actions.find((a) => a.properties?.action?.trigger === 'step');
    expect(endingAction).toBeDefined();
    const steps = endingAction!.properties!.action!.steps;
    const hasEndAdventure = steps.some((s) => s.type === 'endAdventure');
    expect(hasEndAdventure).toBe(true);
  });

  it('exit zone in Cliffside points to Lighthouse Top scene', async () => {
    const { generateLighthouseBundle } = await import('../src/lib/sampleCollections/lighthouse.js');
    const bundle = generateLighthouseBundle();
    const cliffside = bundle.collection.scenes.find((s) => s.name === 'Cliffside')!;
    const top = bundle.collection.scenes.find((s) => s.name === 'Lighthouse Top')!;
    const exits = (cliffside.scene.entities ?? []).filter(isExit);
    expect(exits[0].properties?.targetSceneId).toBe(top.id);
  });

  it('spawn and NPC have a sprite sheet assigned', async () => {
    const { generateLighthouseBundle } = await import('../src/lib/sampleCollections/lighthouse.js');
    const bundle = generateLighthouseBundle();
    const cliffside = bundle.collection.scenes.find((s) => s.name === 'Cliffside')!;
    const entities = cliffside.scene.entities ?? [];
    const spawn = entities.find(isSpawn)!;
    const npc = entities.find(isNpc)!;
    expect(spawn.properties?.spriteSheetId).toBeTruthy();
    expect(npc.properties?.spriteSheetId).toBeTruthy();
    // Both point to the same hero sheet included in the bundle
    expect(bundle.spriteSheets[spawn.properties!.spriteSheetId!]).toBeDefined();
  });

  it('collision layer is present and sized correctly in both scenes', async () => {
    const { generateLighthouseBundle } = await import('../src/lib/sampleCollections/lighthouse.js');
    const bundle = generateLighthouseBundle();
    for (const entry of bundle.collection.scenes) {
      const s = entry.scene;
      expect(s.collisionLayer).toBeDefined();
      expect(s.collisionLayer!.length).toBe(s.width * s.height);
    }
  });
});
