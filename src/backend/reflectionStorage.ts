import type { FieldId, FieldReflections, Reflection } from "../ikigai-alpha/types";

export const fieldIds: FieldId[] = ["love", "ability", "meaning", "paid"];
export const emptyMap = (): FieldReflections => ({ love: [], ability: [], meaning: [], paid: [] });
export const cacheKey = "locus-cloud-map-v1";
export const storageKey = (id: FieldId) => `locus-reflections-${id}-v1`;
export const legacyLoveKey = "locus-love-reflections-v1";
export const sameMap = (a: FieldReflections, b: FieldReflections) => JSON.stringify(a) === JSON.stringify(b);

export function seedFromId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function normalizeMap(value: unknown): FieldReflections {
  const result = emptyMap();
  if (!value || typeof value !== "object") return result;
  const source = value as Record<string, unknown>;
  for (const fieldId of fieldIds) {
    if (!Array.isArray(source[fieldId])) continue;
    for (const item of source[fieldId] as unknown[]) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const label = row.label ?? row.displayLabel;
      if (typeof label !== "string" || !label.trim()) continue;
      const id = typeof row.id === "string" ? row.id : crypto.randomUUID();
      const notes = row.notes ?? row.fullText ?? row.thought;
      result[fieldId].push({ id, fieldId, label: label.trim().slice(0, 40),
        notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 600) : undefined,
        createdAt: typeof row.createdAt === "number" && Number.isFinite(row.createdAt) ? row.createdAt : Date.now(),
        positionSeed: typeof row.positionSeed === "number" && Number.isFinite(row.positionSeed) ? Math.abs(row.positionSeed % 1) : seedFromId(id),
      });
    }
  }
  return result;
}

export interface MapCache {
  owner: string | null;
  revision: number;
  base: FieldReflections;
  local: FieldReflections;
}

export function loadCache(storage: Pick<Storage, "getItem">): MapCache {
  try {
    const saved = JSON.parse(storage.getItem(cacheKey) ?? "null");
    if (saved && saved.local && saved.base && Number.isInteger(saved.revision)) {
      return { owner: typeof saved.owner === "string" ? saved.owner : null, revision: saved.revision,
        base: normalizeMap(saved.base), local: normalizeMap(saved.local) };
    }
  } catch { /* Fall back to the existing per-field data when the new cache is unreadable. */ }
  const legacy: Record<string, unknown> = {};
  for (const id of fieldIds) {
    try {
      legacy[id] = JSON.parse(storage.getItem(storageKey(id)) ?? (id === "love" ? storage.getItem(legacyLoveKey) : null) ?? "[]");
    } catch { legacy[id] = []; }
  }
  return { owner: null, revision: 0, base: emptyMap(), local: normalizeMap(legacy) };
}

// Rebase only local changes onto the newest cloud map. Missing local IDs that
// existed in base are deletions, while unrelated remote additions are retained.
export function mergeMaps(base: FieldReflections, local: FieldReflections, remote: FieldReflections): FieldReflections {
  const result = emptyMap();
  for (const id of fieldIds) {
    const before = new Map(base[id].map((r) => [r.id, r]));
    const current = new Map(local[id].map((r) => [r.id, r]));
    const merged = new Map<string, Reflection>(remote[id].map((r) => [r.id, r]));
    for (const key of before.keys()) if (!current.has(key)) merged.delete(key);
    for (const [key, row] of current) {
      if (JSON.stringify(row) !== JSON.stringify(before.get(key))) merged.set(key, row);
    }
    result[id] = [...merged.values()].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  }
  return result;
}
