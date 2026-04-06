import { useState, useCallback } from 'react';
import { TILE_SIZE } from '@storyengine/shared';
import { useEditorStore } from '../store/editorStore.js';
import { saveTileset } from '../lib/assetDb.js';
import { logger } from '../logger.js';
import type { ImportWarning } from '../types/editor.js';

export function useTilesetImport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ImportWarning[]>([]);
  const setTileset = useEditorStore((s) => s.setTileset);

  const importTileset = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setIsLoading(true);
      setError(null);
      setWarnings([]);

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

        const newWarnings: ImportWarning[] = [];

        if (file.size > 2 * 1024 * 1024) {
          newWarnings.push({
            level: 'warn',
            message: `Large file (${(file.size / 1024 / 1024).toFixed(1)} MB) — may use significant memory`,
          });
        }

        if (image.width % TILE_SIZE !== 0 || image.height % TILE_SIZE !== 0) {
          newWarnings.push({
            level: 'warn',
            message: `Dimensions ${image.width}x${image.height} not a multiple of ${TILE_SIZE} — partial tiles will be cropped`,
          });
        }

        const totalTiles = columns * rows;
        if (totalTiles > 256) {
          newWarnings.push({
            level: 'warn',
            message: `${totalTiles} tiles — large tileset may be slow`,
          });
        }

        const isPng = file.type === 'image/png';
        if (!isPng) {
          newWarnings.push({
            level: 'info',
            message: `Converted from ${file.type.split('/')[1]?.toUpperCase() ?? 'unknown'} to PNG`,
          });
        }

        setWarnings(newWarnings);

        const pngDataUrl = isPng ? dataUrl : ensurePngDataUrl(image);

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
          imageDataUrl: pngDataUrl,
          tileImages,
        });

        saveTileset({
          id: 'current',
          filename: file.name,
          dataUrl: pngDataUrl,
          tileSize: TILE_SIZE,
          columns,
          storedAt: Date.now(),
        }).catch((err) => {
          logger.warn('Failed to persist tileset to IndexedDB', { error: String(err) });
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

  return { importTileset, isLoading, error, warnings };
}

function ensurePngDataUrl(image: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
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
