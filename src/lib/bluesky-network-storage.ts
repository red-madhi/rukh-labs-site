import type { ScanSnapshot } from "@/lib/bluesky-network";

const DATABASE_NAME = "rukh-labs-network-explorer";
const STORE_NAME = "scans";
const DATABASE_VERSION = 1;

export type ScanStorageKey = "followers" | "following";

function storageId(key: ScanStorageKey) {
  return `latest:${key}`;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("This browser does not support local scan storage."));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Local scan storage could not be opened."));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase();

  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("Local scan storage failed."));
      transaction.onabort = () =>
        reject(transaction.error || new Error("Local scan storage was interrupted."));
    });
  } finally {
    database.close();
  }
}

export async function saveScan(
  snapshot: ScanSnapshot,
  key: ScanStorageKey = "followers",
) {
  await withStore("readwrite", (store) =>
    store.put({ ...snapshot, id: storageId(key) }),
  );
}

export async function loadLatestScan(key: ScanStorageKey = "followers") {
  let result = await withStore<ScanSnapshot | undefined>("readonly", (store) =>
    store.get(storageId(key)),
  );

  // The first release saved follower scans under the literal key "latest".
  if (!result && key === "followers") {
    result = await withStore<ScanSnapshot | undefined>("readonly", (store) =>
      store.get("latest"),
    );
  }

  return result ?? null;
}

export async function deleteLatestScan(key: ScanStorageKey = "followers") {
  await withStore("readwrite", (store) => store.delete(storageId(key)));
  if (key === "followers") {
    await withStore("readwrite", (store) => store.delete("latest"));
  }
}
