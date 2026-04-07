import type { SceneCollection } from '@storyengine/shared';
import type { Prefab, StoredAnimation } from '../types/editor.js';

const DB_NAME = 'tile-creator-assets';
const DB_VERSION = 5;
const STORE_TILESETS = 'tilesets';
const STORE_COLLECTIONS = 'collections';
const STORE_PREFABS = 'prefabs';
const STORE_ANIMATIONS = 'animations';

export interface StoredTileset {
  id: string;
  name: string;
  filename: string;
  dataUrl: string;
  tileSize: number;
  columns: number;
  storedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion;
      if (oldVersion < 1) {
        db.createObjectStore(STORE_TILESETS, { keyPath: 'id' });
      }
      if (oldVersion < 3 && !db.objectStoreNames.contains(STORE_COLLECTIONS)) {
        db.createObjectStore(STORE_COLLECTIONS, { keyPath: 'id' });
      }
      if (oldVersion < 4 && !db.objectStoreNames.contains(STORE_PREFABS)) {
        db.createObjectStore(STORE_PREFABS, { keyPath: 'id' });
      }
      if (oldVersion < 5 && !db.objectStoreNames.contains(STORE_ANIMATIONS)) {
        db.createObjectStore(STORE_ANIMATIONS, { keyPath: 'id' });
      }
      if (oldVersion === 1) {
        const store = req.transaction!.objectStore(STORE_TILESETS);
        const getReq = store.get('current');
        getReq.onsuccess = () => {
          if (getReq.result) {
            store.delete('current');
            const migrated = {
              ...getReq.result,
              id: crypto.randomUUID(),
              name: (getReq.result.filename ?? 'tileset').replace(/\.[^.]+$/, ''),
            };
            store.put(migrated);
          }
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

export async function saveTilesetToLibrary(tileset: StoredTileset): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TILESETS, 'readwrite');
    tx.objectStore(STORE_TILESETS).put(tileset);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadTilesetById(id: string): Promise<StoredTileset | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TILESETS, 'readonly');
    const req = tx.objectStore(STORE_TILESETS).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listAllTilesets(): Promise<StoredTileset[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TILESETS, 'readonly');
    const req = tx.objectStore(STORE_TILESETS).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTilesetById(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TILESETS, 'readwrite');
    tx.objectStore(STORE_TILESETS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveCollection(collection: SceneCollection): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COLLECTIONS, 'readwrite');
    tx.objectStore(STORE_COLLECTIONS).put(collection);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCollection(id: string): Promise<SceneCollection | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COLLECTIONS, 'readonly');
    const req = tx.objectStore(STORE_COLLECTIONS).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listCollections(): Promise<SceneCollection[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COLLECTIONS, 'readonly');
    const req = tx.objectStore(STORE_COLLECTIONS).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COLLECTIONS, 'readwrite');
    tx.objectStore(STORE_COLLECTIONS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function savePrefab(prefab: Prefab): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PREFABS, 'readwrite');
    tx.objectStore(STORE_PREFABS).put(prefab);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listPrefabs(): Promise<Prefab[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PREFABS, 'readonly');
    const req = tx.objectStore(STORE_PREFABS).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePrefabById(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PREFABS, 'readwrite');
    tx.objectStore(STORE_PREFABS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveAnimation(anim: StoredAnimation): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ANIMATIONS, 'readwrite');
    tx.objectStore(STORE_ANIMATIONS).put(anim);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listAnimations(): Promise<StoredAnimation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ANIMATIONS, 'readonly');
    const req = tx.objectStore(STORE_ANIMATIONS).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAnimationById(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ANIMATIONS, 'readwrite');
    tx.objectStore(STORE_ANIMATIONS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
