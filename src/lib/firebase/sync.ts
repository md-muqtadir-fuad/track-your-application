import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import type { Repositories } from '../db/repositories';
import type { SqlJsExecutor } from '../db/sqljs-executor';

const IDB_NAME = 'phd_tracker_db_store';
const IDB_STORE = 'sqlite_snapshots';
const IDB_KEY = 'latest_db';

// --- Local IndexedDB Persistence ---
export async function saveLocalSnapshot(data: Uint8Array): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(data, IDB_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
    request.onerror = () => reject(request.error);
  });
}

export async function loadLocalSnapshot(): Promise<Uint8Array | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  return new Promise((resolve) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(IDB_KEY);
      getReq.onsuccess = () => {
        db.close();
        resolve(getReq.result ? (getReq.result as Uint8Array) : null);
      };
      getReq.onerror = () => {
        db.close();
        resolve(null);
      };
    };
    request.onerror = () => resolve(null);
  });
}

// --- Helpers for Uint8Array to base64 ---
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// --- Cloud Sync with Firebase Firestore ---

export async function syncToFirestore(
  db: Firestore,
  uid: string,
  executor: SqlJsExecutor,
  repos: Repositories,
): Promise<void> {
  const binary = executor.exportBinary();
  if (!binary) return;

  // 1. Save locally in IndexedDB first
  await saveLocalSnapshot(binary);

  // 2. Upload SQLite snapshot to Firestore
  const base64 = uint8ToBase64(binary);
  const now = new Date().toISOString();

  await setDoc(doc(db, 'users', uid, 'sync', 'database'), {
    snapshot: base64,
    updated_at: now,
  });

  // 3. Mirror human-readable entities to Firestore collections
  try {
    const [apps, unis, contacts, milestones, checklists] = await Promise.all([
      repos.applications.list(true),
      repos.universities.list(true),
      repos.contacts.list(undefined, true),
      repos.milestones.listAll(true),
      repos.checklistItems.listAll(true),
    ]);

    // Batch mirror in background
    for (const app of apps) {
      await setDoc(doc(db, 'users', uid, 'applications', app.id), app, { merge: true });
    }
    for (const uni of unis) {
      await setDoc(doc(db, 'users', uid, 'universities', uni.id), uni, { merge: true });
    }
    for (const c of contacts) {
      await setDoc(doc(db, 'users', uid, 'contacts', c.id), c, { merge: true });
    }
    for (const m of milestones) {
      await setDoc(doc(db, 'users', uid, 'milestones', m.id), m, { merge: true });
    }
    for (const cl of checklists) {
      await setDoc(doc(db, 'users', uid, 'checklist_items', cl.id), cl, { merge: true });
    }
  } catch (err) {
    console.warn('Non-blocking error mirroring entities to Firestore collections:', err);
  }
}

export async function loadFromFirestore(db: Firestore, uid: string): Promise<Uint8Array | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'sync', 'database'));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!data.snapshot) return null;
    const binary = base64ToUint8(data.snapshot as string);
    // Cache to local IndexedDB
    await saveLocalSnapshot(binary);
    return binary;
  } catch (err) {
    console.error('Failed to load snapshot from Firestore:', err);
    return null;
  }
}
