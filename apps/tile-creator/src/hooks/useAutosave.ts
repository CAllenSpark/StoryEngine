import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore.js';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 2000;

/**
 * Watches the editor store for scene/collection mutations.
 * After DEBOUNCE_MS of idle, auto-saves to IndexedDB.
 * Exposes the current status for a UI pill.
 * Also installs a beforeunload guard when unsaved changes exist.
 */
export function useAutosave() {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const save = useCallback(async () => {
    const store = useEditorStore.getState();
    if (!store.currentCollection) return;
    savingRef.current = true;
    setStatus('saving');
    try {
      await store.saveCollectionToDb();
      setLastSavedAt(Date.now());
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      savingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Track which store fields we care about for autosave.
    // We use a shallow snapshot comparison strategy — if the scene
    // or collection object identity changes, we schedule a save.
    let prevScene = useEditorStore.getState().scene;
    let prevCollection = useEditorStore.getState().currentCollection;

    const unsub = useEditorStore.subscribe((state) => {
      // Only trigger autosave if scene or collection changed
      if (state.scene === prevScene && state.currentCollection === prevCollection) return;
      prevScene = state.scene;
      prevCollection = state.currentCollection;

      // Don't interrupt an in-flight save
      if (savingRef.current) return;

      setStatus('unsaved');

      // Debounce: reset the timer on every change
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        save();
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [save]);

  // beforeunload guard — warn if there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (status === 'unsaved' || status === 'saving') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status]);

  return { status, lastSavedAt, saveNow: save };
}

/** Returns a human-readable "Xs ago" string, or null if no save yet. */
export function formatTimeSince(timestamp: number | null): string | null {
  if (!timestamp) return null;
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}
