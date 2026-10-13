import type { FieldReflections } from "../ikigai-alpha/types";
import { cacheKey, fieldIds, legacyLoveKey, loadCache, mergeMaps, normalizeMap, storageKey } from "./reflectionStorage";

export const localMapKey = "locus-device-map-v1";
type StorageAccess = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export class LocalStore {
  private listeners = new Set<() => void>();
  private base: FieldReflections;
  private snapshot: { reflections: FieldReflections; storageFailed: boolean };
  constructor(private storage: StorageAccess) {
    let storageFailed = false;
    let reflections: FieldReflections;
    try {
      const local = storage.getItem(localMapKey);
      reflections = local === null ? loadCache(storage).local : normalizeMap(JSON.parse(local));
    } catch { reflections = loadCache(storage).local; storageFailed = true; }
    this.base = reflections;
    this.snapshot = { reflections, storageFailed };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(reflections: FieldReflections, storageFailed: boolean) {
    this.snapshot = { reflections, storageFailed };
    this.listeners.forEach((listener) => listener());
  }
  update = (change: FieldReflections | ((current: FieldReflections) => FieldReflections)) => {
    let next = typeof change === "function" ? change(this.snapshot.reflections) : change;
    try {
      const latest = this.storage.getItem(localMapKey);
      if (latest !== null) next = mergeMaps(this.base, next, normalizeMap(JSON.parse(latest)));
      this.storage.setItem(localMapKey, JSON.stringify(next));
      this.base = next;
      // Retire old browser copies only after the replacement has been safely saved.
      for (const key of [cacheKey, legacyLoveKey, ...fieldIds.map(storageKey)]) {
        try { this.storage.removeItem(key); } catch { /* The new map remains authoritative. */ }
      }
      this.emit(next, false);
    } catch { this.emit(next, true); }
  };
  persist = () => this.update(this.snapshot.reflections);
  refresh = () => {
    try {
      const latest = this.storage.getItem(localMapKey);
      if (latest === null) return;
      const remote = normalizeMap(JSON.parse(latest));
      const next = mergeMaps(this.base, this.snapshot.reflections, remote);
      this.base = remote;
      this.emit(next, this.snapshot.storageFailed);
    } catch { this.emit(this.snapshot.reflections, true); }
  };
}
