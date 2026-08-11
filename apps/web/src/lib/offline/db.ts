// IndexedDB mínimo para la captura offline. Dos almacenes: "drafts" (borradores
// cifrados de reportes) y "keys" (clave de dispositivo AES-GCM no exportable).
const DB_NAME = "sinapve-offline";
const DB_VERSION = 1;

export type DraftRecord = {
  id: string;
  ciphertext: string; // base64: iv(12) + datos cifrados AES-GCM
  createdAt: string;
  status: "pending" | "failed";
  lastError?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("drafts")) db.createObjectStore("drafts", { keyPath: "id" });
      if (!db.objectStoreNames.contains("keys")) db.createObjectStore("keys");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export const draftsStore = {
  put: (record: DraftRecord) => tx("drafts", "readwrite", (s) => s.put(record)),
  getAll: () => tx<DraftRecord[]>("drafts", "readonly", (s) => s.getAll() as IDBRequest<DraftRecord[]>),
  delete: (id: string) => tx("drafts", "readwrite", (s) => s.delete(id))
};

export const keysStore = {
  get: (key: string) => tx<unknown>("keys", "readonly", (s) => s.get(key)),
  put: (key: string, value: unknown) => tx("keys", "readwrite", (s) => s.put(value, key))
};
