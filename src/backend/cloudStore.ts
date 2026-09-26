import { analyzeCenter } from "../ikigai-alpha/centerAnalysis";
import type { FieldReflections } from "../ikigai-alpha/types";
import { cacheKey, emptyMap, loadCache, mergeMaps, normalizeMap, sameMap, type MapCache } from "./reflectionStorage";

export const engineVersion = "local-semantic-v1";
export type SyncStatus = "connecting" | "saving" | "saved" | "offline" | "error" | "session-lost";
export interface CloudMap { revision: number; reflections: FieldReflections; engineVersion?: string }
export interface CloudTransport {
  identify(owner: string | null): Promise<string>;
  load(): Promise<CloudMap>;
  save(revision: number, reflections: FieldReflections, output: unknown): Promise<number | null>;
}

export class CloudStore {
  private cache: MapCache;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private busy = false;
  private stopped = true;
  private retryDelay = 2000;
  private storageFailed = false;
  private snapshot: { reflections: FieldReflections; status: SyncStatus; storageFailed: boolean };

  constructor(private storage: Pick<Storage, "getItem" | "setItem">, private transport: CloudTransport) {
    this.cache = loadCache(storage);
    this.snapshot = { reflections: this.cache.local, status: "connecting", storageFailed: false };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private emit(status: SyncStatus) {
    this.snapshot = { reflections: this.cache.local, status, storageFailed: this.storageFailed };
    this.listeners.forEach((fn) => fn());
  }
  private persist() {
    try { this.storage.setItem(cacheKey, JSON.stringify(this.cache)); this.storageFailed = false; }
    catch { this.storageFailed = true; }
  }
  update = (change: FieldReflections | ((current: FieldReflections) => FieldReflections)) => {
    this.cache.local = typeof change === "function" ? change(this.cache.local) : change;
    this.persist();
    this.emit("saving");
    this.schedule(650);
  };
  start = () => { this.stopped = false; this.schedule(0); };
  stop = () => { this.stopped = true; clearTimeout(this.timer); };
  retry = () => { this.retryDelay = 2000; this.schedule(0); };
  private schedule(delay: number) {
    clearTimeout(this.timer);
    if (!this.stopped) this.timer = setTimeout(() => { void this.sync(); }, delay);
  }
  async sync() {
    if (this.busy || this.stopped) return;
    this.busy = true;
    this.emit("saving");
    try {
      const owner = await this.transport.identify(this.cache.owner);
      if (this.cache.owner && owner !== this.cache.owner) throw new Error("session-lost");
      this.cache.owner = owner;
      this.persist();
      const remote = await this.transport.load();
      this.cache.local = mergeMaps(this.cache.base, this.cache.local, remote.reflections);
      this.cache.base = remote.reflections;
      this.cache.revision = remote.revision;
      this.persist();
      this.emit("saving");
      const sent = this.cache.local;
      const nonempty = Object.values(sent).some((rows) => rows.length > 0);
      if (!sameMap(sent, remote.reflections) || (nonempty && remote.engineVersion !== engineVersion)) {
        const output = nonempty ? analyzeCenter(sent).insight : null;
        const revision = await this.transport.save(remote.revision, sent, output);
        if (revision === null) { this.schedule(100); return; }
        this.cache.base = sent;
        this.cache.revision = revision;
        this.persist();
      }
      this.retryDelay = 2000;
      const pending = !sameMap(this.cache.local, this.cache.base);
      this.emit(pending ? "saving" : "saved");
      if (pending) this.schedule(100);
    } catch (error) {
      const lost = error instanceof Error && error.message === "session-lost";
      this.emit(lost ? "session-lost" : typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error");
      if (!lost) { this.schedule(this.retryDelay); this.retryDelay = Math.min(60000, this.retryDelay * 2); }
    } finally { this.busy = false; }
  }
}

export function decodeCloudRow(row: { revision: number; reflections: unknown; engine_version: string } | null): CloudMap {
  return row ? { revision: row.revision, reflections: normalizeMap(row.reflections), engineVersion: row.engine_version }
    : { revision: 0, reflections: emptyMap() };
}
