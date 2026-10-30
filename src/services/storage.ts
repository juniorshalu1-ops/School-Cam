import { AppSettings, CapturedPhoto } from '../types';

const DB_NAME = 'SchoolCamDB';
const DB_VERSION = 1;
const STORE_PHOTOS = 'photos';
const STORE_SETTINGS = 'settings';

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  gridEnabled: true,
  levelEnabled: true,
  highQualityCapture: true,
  watermarkConfig: {
    layout: 'standard',
    position: 'bottom',
    includeNote: true,
    includeAddress: true,
    includeCoordinates: true,
    includeAltitude: true,
    includeAccuracy: true,
    includeTimestamp: true,
    includeCompass: true,
    includeMiniMap: true,
    coordinateFormat: 'decimal',
    customPrefix: 'SchoolCam by Satyam',
    bannerOpacity: 0.85,
  },
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        const photoStore = db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
        photoStore.createIndex('timestamp', 'timestamp', { unique: false });
        photoStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePhoto(photo: CapturedPhoto): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PHOTOS], 'readwrite');
    const store = tx.objectStore(STORE_PHOTOS);
    const request = store.put(photo);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllPhotos(): Promise<CapturedPhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PHOTOS], 'readonly');
    const store = tx.objectStore(STORE_PHOTOS);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // Latest first
    const results: CapturedPhoto[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PHOTOS], 'readwrite');
    const store = tx.objectStore(STORE_PHOTOS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updatePhotoNote(id: string, note: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PHOTOS], 'readwrite');
    const store = tx.objectStore(STORE_PHOTOS);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const photo = getReq.result as CapturedPhoto | undefined;
      if (!photo) {
        reject(new Error('Photo not found'));
        return;
      }
      photo.note = note;
      const putReq = store.put(photo);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SETTINGS], 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get('app_settings');

      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve({ ...DEFAULT_SETTINGS, ...req.result.value });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };

      req.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SETTINGS], 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.put({ key: 'app_settings', value: settings });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Could not save settings:', e);
  }
}

export { DEFAULT_SETTINGS };
