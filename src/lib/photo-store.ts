'use client';

/**
 * Photo storage for field-journal sightings.
 *
 * Photos go in IndexedDB, not localStorage. A single phone photo is several megabytes,
 * localStorage holds roughly five in total and stores strings only, so base64-ing images
 * into it would blow the quota after two or three sightings and take the player's whole
 * collection down with it. IndexedDB stores Blobs and is measured in hundreds of MB.
 *
 * Downscaling lives in `image-prepare.ts` rather than here, because the signed-IN path
 * needs exactly the same treatment and used to go without it — see that file.
 */

import { prepareImage } from './image-prepare';

const DB_NAME = 'plantdex-photos';
const DB_VERSION = 1;
const STORE = 'photos';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePhoto(file: File): Promise<string> {
  const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { blob } = await prepareImage(file);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

/**
 * Returns an object URL for a stored photo, or null if it is gone.
 * Callers must revokeObjectURL when done, or the blob stays pinned in memory.
 */
export async function getPhotoUrl(id: string): Promise<string | null> {
  try {
    const db = await openDb();
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result as Blob | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

export async function deletePhoto(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // A stranded blob is harmless; never let cleanup break deleting a sighting.
  }
}
