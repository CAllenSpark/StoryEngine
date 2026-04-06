import type { StateCreator, StoreMutatorIdentifier } from 'zustand';
import { temporal } from 'zundo';
import type { EditorStore } from '../types/editor.js';

type TemporalConfig = Parameters<typeof temporal<EditorStore>>[1];

export const HISTORY_LIMIT = 100;

export const historyConfig: TemporalConfig = {
  limit: HISTORY_LIMIT,
  partialize: (state) => {
    const { scene } = state;
    return { scene } as EditorStore;
  },
  equality: (pastState, currentState) =>
    pastState.scene === currentState.scene,
};

export function withHistory<
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  config: StateCreator<EditorStore, Mps, Mcs>,
): StateCreator<EditorStore, Mps, [['temporal', unknown], ...Mcs]> {
  return temporal<EditorStore>(config as StateCreator<EditorStore, [], []>, historyConfig) as unknown as StateCreator<EditorStore, Mps, [['temporal', unknown], ...Mcs]>;
}
