import { useState, useCallback } from 'react';
import { TILE_SIZE } from '@storyengine/shared';
import { useEditorStore } from '../store/editorStore.js';
import { logger } from '../logger.js';

export function useTilesetImport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setTileset = useEditorStore((s) => s.setTileset);

  const importTileset = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setIsLoading(true);
      setError(null);

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const image = await loadImage(dataUrl);
        const columns = Math.floor(image.width / TILE_SIZE);
        const rows = Math.floor(image.height / TILE_SIZE);

        if (columns === 0 || rows === 0) {
          throw new Error(
            `Image too small: ${image.width}x${image.height} (need at least ${TILE_SIZE}x${TILE_SIZE})`,
          );
        }

        const tileImages: ImageBitmap[] = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < columns; c++) {
            const bmp = await createImageBitmap(
              image,
              c * TILE_SIZE,
              r * TILE_SIZE,
              TILE_SIZE,
              TILE_SIZE,
            );
            tileImages.push(bmp);
          }
        }

        const name = file.name.replace(/\.[^.]+$/, '');

        setTileset({
          ref: { name, tileSize: TILE_SIZE, image: file.name, columns },
          imageDataUrl: dataUrl,
          tileImages,
        });

        logger.info('Tileset imported', {
          name,
          columns,
          rows,
          tileCount: tileImages.length,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to import tileset';
        setError(msg);
        logger.error('Tileset import failed', { error: msg });
      } finally {
        setIsLoading(false);
      }
    };

    input.click();
  }, [setTileset]);

  return { importTileset, isLoading, error };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}
