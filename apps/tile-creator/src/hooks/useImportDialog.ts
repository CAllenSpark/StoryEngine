import { useState, useCallback } from 'react';

const COMMON_SIZES = [8, 16, 24, 32, 48, 64];

export interface ImportDialogState {
  isOpen: boolean;
  imageDataUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  fileName: string;
  fileType: string;
  selectedTileSize: number;
  detectedSizes: number[];
}

function detectTileSizes(w: number, h: number): number[] {
  return COMMON_SIZES.filter(
    (s) => w % s === 0 && h % s === 0 && w / s >= 2 && h / s >= 2,
  );
}

const INITIAL_STATE: ImportDialogState = {
  isOpen: false,
  imageDataUrl: null,
  imageWidth: 0,
  imageHeight: 0,
  fileName: '',
  fileType: '',
  selectedTileSize: 16,
  detectedSizes: [],
};

export function useImportDialog() {
  const [state, setState] = useState<ImportDialogState>(INITIAL_STATE);

  const openDialog = useCallback(
    (dataUrl: string, width: number, height: number, fileName: string, fileType: string) => {
      const detected = detectTileSizes(width, height);
      const best = detected.includes(16) ? 16 : detected[0] ?? 16;
      setState({
        isOpen: true,
        imageDataUrl: dataUrl,
        imageWidth: width,
        imageHeight: height,
        fileName,
        fileType,
        selectedTileSize: best,
        detectedSizes: detected,
      });
    },
    [],
  );

  const closeDialog = useCallback(() => setState(INITIAL_STATE), []);

  const setSelectedTileSize = useCallback(
    (size: number) => setState((s) => ({ ...s, selectedTileSize: Math.max(1, size) })),
    [],
  );

  return { dialogState: state, openDialog, closeDialog, setSelectedTileSize };
}
