export interface AutoTileResult {
  uniqueTiles: ImageBitmap[];
  tileMap: number[];
  columns: number;
  rows: number;
}

/**
 * Slice an image into a grid of tiles, deduplicating exact pixel matches.
 * Returns the unique tile set and a mapping from grid position to tile index.
 */
export async function autoTileImage(
  image: HTMLImageElement | ImageBitmap,
  tileSize: number,
): Promise<AutoTileResult> {
  const imgW = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const imgH = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const columns = Math.floor(imgW / tileSize);
  const rows = Math.floor(imgH / tileSize);

  if (columns === 0 || rows === 0) {
    throw new Error(`Image too small for ${tileSize}px tiles: ${imgW}x${imgH}`);
  }

  const canvas = new OffscreenCanvas(tileSize, tileSize);
  const ctx = canvas.getContext('2d')!;

  const hashToIndex = new Map<string, number>();
  const uniqueTiles: ImageBitmap[] = [];
  const tileMap: number[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.drawImage(image, c * tileSize, r * tileSize, tileSize, tileSize, 0, 0, tileSize, tileSize);
      const pixels = ctx.getImageData(0, 0, tileSize, tileSize).data;
      const hash = hashPixels(pixels);

      const existing = hashToIndex.get(hash);
      if (existing !== undefined) {
        tileMap.push(existing);
      } else {
        const bmp = await createImageBitmap(canvas);
        const idx = uniqueTiles.length;
        uniqueTiles.push(bmp);
        hashToIndex.set(hash, idx);
        tileMap.push(idx);
      }
    }
  }

  return { uniqueTiles, tileMap, columns, rows };
}

/** Fast hash of pixel RGBA data using FNV-1a. */
function hashPixels(data: Uint8ClampedArray): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h ^= data[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
