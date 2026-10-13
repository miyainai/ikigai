import { describe, expect, it } from "vitest";
import { nextUnexploredField } from "./nextField";
import type { FieldId, FieldReflections } from "./types";

const mapWith = (...fields: FieldId[]): FieldReflections => {
  const map: FieldReflections = { love: [], ability: [], meaning: [], paid: [] };
  fields.forEach((fieldId) => { map[fieldId] = [{ id: fieldId, fieldId, label: "Example", createdAt: 1, positionSeed: 1 }]; });
  return map;
};
describe("next reflection field", () => {
  it("starts with Love and follows the four-field sequence", () => {
    expect(nextUnexploredField(mapWith())?.id).toBe("love");
    expect(nextUnexploredField(mapWith("love"), "love")?.id).toBe("ability");
    expect(nextUnexploredField(mapWith("love", "ability"), "ability")?.id).toBe("meaning");
    expect(nextUnexploredField(mapWith("love", "ability", "meaning"), "meaning")?.id).toBe("paid");
  });
  it("skips already populated fields and wraps if the user starts elsewhere", () => {
    expect(nextUnexploredField(mapWith("love", "ability"), "love")?.id).toBe("meaning");
    expect(nextUnexploredField(mapWith("paid"), "paid")?.id).toBe("love");
  });
  it("finishes the first round rather than pushing another entry", () => {
    expect(nextUnexploredField(mapWith("love", "ability", "meaning", "paid"), "paid")).toBeNull();
  });
  it("lets users skip an empty field without immediately sending them back", () => {
    expect(nextUnexploredField(mapWith(), "love")?.id).toBe("ability");
  });
});
