import { getWorkspaceId } from "./workspace";
import type { StoredReport } from "./api";

const DB_NAME = "inspectra_db";
const STORE = "reports";
const DB_VERSION = 1;
const MAX_REPORTS = 50;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("workspace_id", "workspace_id", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };
  });
}

export async function saveReport(report: StoredReport): Promise<void> {
  const db = await openDb();
  const workspace_id = getWorkspaceId();
  const entry = { ...report, workspace_id, created_at: report.created_at ?? Date.now() };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = async () => {
      const all = await listReports();
      if (all.length > MAX_REPORTS) {
        const toRemove = all.slice(MAX_REPORTS);
        const tx2 = db.transaction(STORE, "readwrite");
        for (const r of toRemove) {
          tx2.objectStore(STORE).delete(r.id);
        }
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function listReports(): Promise<StoredReport[]> {
  const db = await openDb();
  const workspace_id = getWorkspaceId();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const all = (req.result as StoredReport[]).filter((r) => r.workspace_id === workspace_id);
      all.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getReport(id: string): Promise<StoredReport | null> {
  const db = await openDb();
  const workspace_id = getWorkspaceId();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => {
      const r = req.result as StoredReport | undefined;
      if (r && r.workspace_id === workspace_id) resolve(r);
      else resolve(null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteReport(id: string): Promise<void> {
  const db = await openDb();
  const existing = await getReport(id);
  if (!existing) return;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
