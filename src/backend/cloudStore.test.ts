import { describe, expect, it } from "vitest";
import { CloudStore, engineVersion, type CloudTransport } from "./cloudStore";
import { cacheKey, emptyMap, loadCache, mergeMaps } from "./reflectionStorage";
import type { FieldReflections, Reflection } from "../ikigai-alpha/types";

const reflection = (id: string, label = id): Reflection => ({ id, fieldId: "love", label, createdAt: 1, positionSeed: 0.4 });
const map = (...rows: Reflection[]): FieldReflections => ({ ...emptyMap(), love: rows });
function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
function fixture() {
  const disk = storage();
  let cloud = emptyMap();
  let revision = 0;
  let output: unknown = null;
  const transport: CloudTransport = {
    identify: async () => "user-a",
    load: async () => ({ reflections: cloud, revision, engineVersion }),
    save: async (expected, input, insight) => {
      if (revision !== expected) return null;
      cloud = input; output = insight; return ++revision;
    },
  };
  const store = new CloudStore(disk, transport);
  return { disk, transport, store, cloud: () => cloud, output: () => output, revision: () => revision };
}

describe("cloud map persistence", () => {
  it("migrates old labels/notes without dropping reflections beyond 24", () => {
    const disk = storage();
    disk.setItem("locus-love-reflections-v1", JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ id: String(i), displayLabel: "Piano", fullText: "Playing with friends", positionSeed: 0.2 }))));
    const saved = loadCache(disk);
    expect(saved.local.love).toHaveLength(30);
    expect(saved.local.love[0]).toMatchObject({ label: "Piano", notes: "Playing with friends", positionSeed: 0.2 });
  });
  it("preserves remote additions while applying local edits and deletes", () => {
    const base = map(reflection("a"), reflection("b"));
    const local = map(reflection("a", "Edited"));
    const remote = map(reflection("a"), reflection("b"), reflection("c"));
    expect(mergeMaps(base, local, remote).love.map((r) => r.label)).toEqual(["Edited", "c"]);
  });
  it("does not resurrect remote deletions when local content is unchanged", () => {
    expect(mergeMaps(map(reflection("a")), map(reflection("a")), emptyMap())).toEqual(emptyMap());
  });
  it("stores matching outputs, reloads without duplicate writes, and clears output", async () => {
    const f = fixture(); f.store.start();
    f.store.update(map(reflection("a", "Teaching math")));
    await f.store.sync();
    expect(f.output()).toMatchObject({ comprehensive: expect.any(Object) });
    expect(f.revision()).toBe(1);
    f.store.stop();
    const reloaded = new CloudStore(f.disk, f.transport); reloaded.start();
    await reloaded.sync(); expect(f.revision()).toBe(1);
    reloaded.update(emptyMap()); await reloaded.sync();
    expect(f.cloud()).toEqual(emptyMap()); expect(f.output()).toBeNull();
    reloaded.stop();
  });
  it("retains edits made during an in-flight write", async () => {
    const f = fixture(); const save = f.transport.save;
    f.transport.save = async (...args) => { f.store.update(map(reflection("a", "Newer"))); return save(...args); };
    f.store.start(); f.store.update(map(reflection("a", "Older"))); await f.store.sync();
    expect(f.store.getSnapshot().reflections.love[0].label).toBe("Newer");
    expect(f.store.getSnapshot().status).toBe("saving");
    f.transport.save = save; await f.store.sync();
    expect(f.cloud().love[0].label).toBe("Newer"); f.store.stop();
  });
  it("retains failed saves across reload and retries them", async () => {
    const f = fixture(); const save = f.transport.save;
    f.transport.save = async () => { throw new Error("Network down"); };
    f.store.start(); f.store.update(map(reflection("offline"))); await f.store.sync(); f.store.stop();
    expect(f.store.getSnapshot().status).toBe("error");
    expect(loadCache(f.disk).local.love[0].id).toBe("offline");
    f.transport.save = save;
    const reloaded = new CloudStore(f.disk, f.transport); reloaded.start(); await reloaded.sync(); reloaded.stop();
    expect(f.cloud().love[0].id).toBe("offline");
  });
  it("does not upload a previous visitor's cache to a different identity", async () => {
    const f = fixture();
    f.disk.setItem(cacheKey, JSON.stringify({ owner: "other-user", revision: 0, base: emptyMap(), local: map(reflection("private")) }));
    const store = new CloudStore(f.disk, f.transport); store.start(); await store.sync(); store.stop();
    expect(store.getSnapshot().status).toBe("session-lost"); expect(f.cloud()).toEqual(emptyMap());
  });
  it("rebases after a conflicting cloud revision", async () => {
    const f = fixture(); const save = f.transport.save; let conflict = true;
    f.transport.save = async (...args) => {
      if (conflict) { conflict = false; await save(0, map(reflection("remote")), null); return null; }
      return save(...args);
    };
    f.store.start(); f.store.update(map(reflection("local"))); await f.store.sync(); await f.store.sync(); f.store.stop();
    expect(f.cloud().love.map((r) => r.id)).toEqual(["local", "remote"]);
  });
});
