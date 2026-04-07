import { useState, useCallback } from 'react';
import { TILE_SIZE } from '@storyengine/shared';
import { useEditorStore } from '../store/editorStore.js';
import { saveTilesetToLibrary } from '../lib/assetDb.js';
import { logger } from '../logger.js';
import { useImportDialog } from './useImportDialog.js';
import type { ImportWarning } from '../types/editor.js';

export function useTilesetImport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ImportWarning[]>([]);
  const setTileset = useEditorStore((s) => s.setTileset);
  const { dialogState, openDialog, closeDialog, setSelectedTileSize } = useImportDialog();

  const importTileset = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setError(null);
      setWarnings([]);

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const image = await loadImage(dataUrl);
        openDialog(dataUrl, image.width, image.height, file.name, file.type);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load image';
        setError(msg);
        logger.error('Tileset load failed', { error: msg });
      }
    };

    input.click();
  }, [openDialog]);

  const commitImport = useCallback(
    async (tileSize: number) => {
      if (!dialogState.imageDataUrl) return;

      setIsLoading(true);
      setError(null);

      try {
        const image = await loadImage(dialogState.imageDataUrl);
        const columns = Math.floor(image.width / tileSize);
        const rows = Math.floor(image.height / tileSize);

        if (columns === 0 || rows === 0) {
          throw new Error(
            `Image too small for ${tileSize}px tiles: ${image.width}x${image.height}`,
          );
        }

        const newWarnings: ImportWarning[] = [];
        const isPng = dialogState.fileType === 'image/png';

        if (!isPng) {
          newWarnings.push({
            level: 'info',
            message: `Converted from ${dialogState.fileType.split('/')[1]?.toUpperCase() ?? 'unknown'} to PNG`,
          });
        }

        setWarnings(newWarnings);
        const pngDataUrl = isPng ? dialogState.imageDataUrl : ensurePngDataUrl(image);

        const tileImages: ImageBitmap[] = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < columns; c++) {
            const bmp = await createImageBitmap(
              image, c * tileSize, r * tileSize, tileSize, tileSize,
            );
            tileImages.push(bmp);
          }
        }

        const name = dialogState.fileName.replace(/\.[^.]+$/, '');

        setTileset({
          ref: { name, tileSize, image: dialogState.fileName, columns },
          imageDataUrl: pngDataUrl,
          tileImages,
        });

        const tilesetId = crypto.randomUUID();
        saveTilesetToLibrary({
          id: tilesetId,
          name,
          filename: dialogState.fileName,
          dataUrl: pngDataUrl,
          tileSize,
          columns,
          storedAt: Date.now(),
        }).then(() => {
          useEditorStore.getState().loadLibrary();
          useEditorStore.setState({ currentTilesetId: tilesetId });
        }).catch((err) => {
          logger.warn('Failed to persist tileset to IndexedDB', { error: String(err) });
        });

        logger.info('Tileset imported', { name, columns, rows, tileSize, tileCount: tileImages.length });
        closeDialog();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to import tileset';
        setError(msg);
        logger.error('Tileset import failed', { error: msg });
      } finally {
        setIsLoading(false);
      }
    },
    [dialogState, setTileset, closeDialog],
  );

  const commitMerge = useCallback(
    async (tileSize: number) => {
      if (!dialogState.imageDataUrl) return;

      setIsLoading(true);
      setError(null);

      try {
        const image = await loadImage(dialogState.imageDataUrl);
        const columns = Math.floor(image.width / tileSize);
        const rows = Math.floor(image.height / tileSize);

        if (columns === 0 || rows === 0) {
          throw new Error(
            `Image too small for ${tileSize}px tiles: ${image.width}x${image.height}`,
          );
        }

        const isPng = dialogState.fileType === 'image/png';
        const pngDataUrl = isPng ? dialogState.imageDataUrl : ensurePngDataUrl(image);

        const tileImages: ImageBitmap[] = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < columns; c++) {
            const bmp = await createImageBitmap(
              image, c * tileSize, r * tileSize, tileSize, tileSize,
            );
            tileImages.push(bmp);
          }
        }

        const name = dialogState.fileName.replace(/\.[^.]+$/, '');

        useEditorStore.getState().mergeTileset({
          ref: { name, tileSize, image: dialogState.fileName, columns },
          imageDataUrl: pngDataUrl,
          tileImages,
        });

        logger.info('Tileset merged', { name, columns, rows, tileSize, tileCount: tileImages.length });
        closeDialog();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to merge tileset';
        setError(msg);
        logger.error('Tileset merge failed', { error: msg });
      } finally {
        setIsLoading(false);
      }
    },
    [dialogState, closeDialog],
  );

  return {
    importTileset, commitImport, commitMerge, isLoading, error, warnings,
    dialogState, closeDialog, setSelectedTileSize,
  };
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
