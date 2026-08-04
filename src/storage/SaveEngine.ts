/**
 * YearGlass Sanctuary — IndexedDB Save Engine
 *
 * Persists sanctuary state to IndexedDB. If IndexedDB is unavailable
 * (e.g. private browsing or webview restrictions), transparently falls back to
 * in-memory storage so the sanctuary continues operating smoothly.
 */

export interface SaveData {
  key: string;
  value: unknown;
  updatedAt: number;
}

const DB_NAME = 'yearglass-sanctuary-save';
const DB_VERSION = 1;
const STORE = 'state';
const META = 'meta';

export class SaveEngine {
  private db: IDBDatabase | null = null;
  private memory = new Map<string, SaveData>();
  private usingIDB = false;
  private initPromise: Promise<boolean> | null = null;

  open(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.openInternal();
    return this.initPromise;
  }

  private openInternal(): Promise<boolean> {
    if (typeof indexedDB === 'undefined') {
      this.usingIDB = false;
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch {
        this.usingIDB = false;
        resolve(false);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(META)) {
          db.createObjectStore(META, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        this.usingIDB = true;
        resolve(true);
      };
      request.onerror = (event) => {
        event.preventDefault();
        this.db = null;
        this.usingIDB = false;
        resolve(false);
      };
      request.onblocked = () => {
        this.usingIDB = false;
        resolve(false);
      };
    });
  }

  async put(key: string, value: unknown): Promise<void> {
    await this.open();
    const record: SaveData = { key, value, updatedAt: Date.now() };
    if (this.usingIDB && this.db) {
      try {
        await this.transact(STORE, 'readwrite', (store) => {
          store.put(record);
        });
        return;
      } catch {
        this.degradeToMemory();
      }
    }
    this.memory.set(key, record);
  }

  async get<T>(key: string): Promise<T | null> {
    await this.open();
    if (this.usingIDB && this.db) {
      try {
        const record = await this.transact<SaveData | undefined>(STORE, 'readonly', (store) => {
          return store.get(key);
        });
        if (record && typeof record === 'object') {
          return record.value as T;
        }
        return null;
      } catch {
        this.degradeToMemory();
      }
    }
    const record = this.memory.get(key);
    return record ? (record.value as T) : null;
  }

  async del(key: string): Promise<void> {
    await this.open();
    if (this.usingIDB && this.db) {
      try {
        await this.transact(STORE, 'readwrite', (store) => {
          store.delete(key);
        });
        return;
      } catch {
        this.degradeToMemory();
      }
    }
    this.memory.delete(key);
  }

  async clear(): Promise<void> {
    await this.open();
    if (this.usingIDB && this.db) {
      try {
        await this.transact(STORE, 'readwrite', (store) => {
          store.clear();
        });
        return;
      } catch {
        this.degradeToMemory();
      }
    }
    this.memory.clear();
  }

  private degradeToMemory(): void {
    this.usingIDB = false;
    if (this.db) {
      try {
        this.db.close();
      } catch {
        /* ignore */
      }
      this.db = null;
    }
  }

  private transact<T>(
    storeName: string,
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest | void
  ): Promise<T> {
    const db = this.db as IDBDatabase;
    return new Promise<T>((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(storeName, mode);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      const store = tx.objectStore(storeName);
      const req = action(store);
      let result: T | undefined;
      if (req) {
        req.onsuccess = () => {
          result = (req as IDBRequest<T>).result;
        };
      }
      tx.oncomplete = () => resolve(result as T);
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
  }

  close(): void {
    if (this.db) {
      try {
        this.db.close();
      } catch {
        /* ignore */
      }
      this.db = null;
    }
    this.initPromise = null;
  }
}
