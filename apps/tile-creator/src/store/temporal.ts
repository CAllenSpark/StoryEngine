import { useEditorStore } from './editorStore.js';

export function useTemporalStore() {
  return useEditorStore.temporal.getState();
}
