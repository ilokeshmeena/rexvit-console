import { openDB } from "idb";

export type StoredSpec = {
  id: string;
  path: string;
  contents: string;
  uploadedAt: string;
};

const DB_NAME = "rexvit-openapi";
const STORE_NAME = "specs";

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, {
        keyPath: "id",
      });
    }
  },
});

export async function saveSpec(spec: StoredSpec) {
  const db = await dbPromise;
  await db.put(STORE_NAME, spec);
}

export async function getAllSpecs(): Promise<StoredSpec[]> {
  const db = await dbPromise;
  return db.getAll(STORE_NAME);
}

export async function deleteSpec(id: string) {
  const db = await dbPromise;
  await db.delete(STORE_NAME, id);
}
