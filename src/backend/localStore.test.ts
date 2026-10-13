import { describe, expect, it } from "vitest";
import { LocalStore, localMapKey } from "./localStore";
import { cacheKey, emptyMap, storageKey } from "./reflectionStorage";
const reflection = (id = "one") => ({ id, label: "Private thought", notes: "Personal notes", fieldId: "love" as const, createdAt: 1, positionSeed: .2 });
function memory() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
}
describe("device-only reflections", () => {
  it("migrates pending cloud-cache edits and notes without any transport", () => {
    const storage = memory();
    storage.setItem(cacheKey, JSON.stringify({ owner: "old-user", revision: 3, base: emptyMap(), local: { ...emptyMap(), love: [reflection()] } }));
    const store = new LocalStore(storage); store.persist();
    expect(store.getSnapshot().reflections.love[0].notes).toBe("Personal notes");
    expect(storage.getItem(cacheKey)).toBeNull();
    expect(storage.getItem(localMapKey)).not.toContain("old-user");
    expect(new LocalStore(storage).getSnapshot().reflections).toEqual(store.getSnapshot().reflections);
  });
  it("does not resurrect a cleared map from legacy data", () => {
    const storage = memory();
    storage.setItem(storageKey("love"), JSON.stringify([reflection()]));
    const store = new LocalStore(storage); store.persist(); store.update(emptyMap());
    expect(new LocalStore(storage).getSnapshot().reflections).toEqual(emptyMap());
  });
  it("keeps the original browser backup and in-memory edits on quota failure", () => {
    const storage = memory();
    storage.setItem(storageKey("love"), JSON.stringify([reflection()]));
    const store = new LocalStore({ ...storage, setItem: () => { throw new Error("Quota"); } });
    store.update((map) => ({ ...map, love: [...map.love, reflection("two")] }));
    expect(store.getSnapshot().reflections.love).toHaveLength(2);
    expect(store.getSnapshot().storageFailed).toBe(true);
    expect(storage.getItem(storageKey("love"))).not.toBeNull();
  });
  it("preserves additions from another tab and propagates deletion", () => {
    const storage = memory(); const a = new LocalStore(storage); a.persist(); const b = new LocalStore(storage);
    a.update((map) => ({ ...map, love: [reflection("a")] }));
    b.update((map) => ({ ...map, love: [reflection("b")] }));
    a.refresh(); expect(a.getSnapshot().reflections.love).toHaveLength(2);
    a.update(emptyMap()); b.refresh(); expect(b.getSnapshot().reflections).toEqual(emptyMap());
  });
});
