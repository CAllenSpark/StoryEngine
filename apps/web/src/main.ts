import {
  GameLoop,
  PixiRenderer,
  Canvas2DRenderer,
  loadTilemap,
  ActorSystem,
  PerfOverlay,
  parseDebugFlags,
} from '@storyengine/engine';
import type { IRenderer } from '@storyengine/engine';
import { INTERNAL_WIDTH, INTERNAL_HEIGHT } from '@storyengine/shared';
import testScene from './spike/test-scene.json';

const ACTOR_COUNT = 200;

async function main(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas element #game not found');

  const flags = parseDebugFlags();

  // Scale canvas to fill viewport with integer scaling
  const scaleX = Math.max(1, Math.floor(window.innerWidth / INTERNAL_WIDTH));
  const scaleY = Math.max(1, Math.floor(window.innerHeight / INTERNAL_HEIGHT));
  const scale = Math.min(scaleX, scaleY);
  canvas.style.width = INTERNAL_WIDTH * scale + 'px';
  canvas.style.height = INTERNAL_HEIGHT * scale + 'px';
  canvas.style.margin = 'auto';
  canvas.style.position = 'absolute';
  canvas.style.top = '50%';
  canvas.style.left = '50%';
  canvas.style.transform = 'translate(-50%, -50%)';

  // Create renderer based on URL param
  const renderer: IRenderer =
    flags.renderer === 'canvas2d' ? new Canvas2DRenderer() : new PixiRenderer();
  await renderer.init(canvas, INTERNAL_WIDTH, INTERNAL_HEIGHT);

  // Load tilemap
  const tilemap = loadTilemap(testScene);

  // Create actor system and spawn actors
  const actorSystem = new ActorSystem(ACTOR_COUNT);
  actorSystem.spawnRandom(ACTOR_COUNT, tilemap);

  // Debug overlay
  const perfOverlay = new PerfOverlay();
  perfOverlay.init(canvas, flags.perf);

  // Camera (static for the spike)
  const camera = { x: 0, y: 0 };

  // Game loop
  const loop = new GameLoop({
    update(dt: number) {
      tilemap.updateAnimations(dt);
      actorSystem.update(dt, tilemap);
    },
    render(_interpolation: number) {
      renderer.begin();
      renderer.drawTilemap(tilemap, camera);
      actorSystem.draw(renderer);
      renderer.end();
      perfOverlay.draw(renderer.stats);
    },
  });

  loop.start();

  // Log renderer type to console
  const rendererName = flags.renderer === 'canvas2d' ? 'Canvas2D' : 'PixiJS v8';
  // eslint-disable-next-line no-console
  console.log(
    `[StoryEngine] Renderer: ${rendererName} | Actors: ${ACTOR_COUNT} | Resolution: ${INTERNAL_WIDTH}x${INTERNAL_HEIGHT} | Debug: ${flags.perf ? 'perf' : 'off'}`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[StoryEngine] Fatal:', err);
});
