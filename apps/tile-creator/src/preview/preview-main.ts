import type { SceneJSON } from '@storyengine/shared';
import { TILE_SIZE } from '@storyengine/shared';

interface PreviewMessage {
  type: 'scene-update';
  scene: SceneJSON;
  tilesetImageDataUrl: string | null;
}

const PLACEHOLDER_COLORS = [
  '#a6e3a1', '#89b4fa', '#f9e2af', '#f38ba8', '#cba6f7',
  '#94e2d5', '#fab387', '#74c7ec', '#f2cdcd', '#b4befe',
];

const canvas = document.getElementById('preview') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

let tileImages: ImageBitmap[] = [];

function render(scene: SceneJSON) {
  const w = scene.width * TILE_SIZE;
  const h = scene.height * TILE_SIZE;

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, w, h);

  for (const layer of scene.layers) {
    for (let y = 0; y < scene.height; y++) {
      for (let x = 0; x < scene.width; x++) {
        const tileId = layer.data[y * scene.width + x];
        if (tileId < 0) continue;

        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tileId < tileImages.length && tileImages[tileId]) {
          ctx.drawImage(tileImages[tileId], px, py, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = PLACEHOLDER_COLORS[tileId % PLACEHOLDER_COLORS.length];
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }
}

async function loadTilesetFromDataUrl(dataUrl: string, columns: number) {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load tileset'));
    img.src = dataUrl;
  });

  const rows = Math.floor(img.height / TILE_SIZE);
  const newTiles: ImageBitmap[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const bmp = await createImageBitmap(
        img,
        c * TILE_SIZE,
        r * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
      newTiles.push(bmp);
    }
  }
  tileImages = newTiles;
}

window.addEventListener('message', async (e: MessageEvent<PreviewMessage>) => {
  const msg = e.data;
  if (!msg || msg.type !== 'scene-update') return;

  if (msg.tilesetImageDataUrl && msg.scene.tileset?.columns > 0) {
    await loadTilesetFromDataUrl(
      msg.tilesetImageDataUrl,
      msg.scene.tileset.columns,
    );
  }

  render(msg.scene);
});
