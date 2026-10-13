import { describe, expect, it } from "vitest";
import { analyzeCenter } from "../ikigai-alpha/centerAnalysis";
import type { FieldReflections } from "../ikigai-alpha/types";
import { createJournal, wrapText } from "./model";

const empty = (): FieldReflections => ({ love: [], ability: [], meaning: [], paid: [] });
describe("reflection journal", () => {
  it("uses current saved words, never exports private notes or identifiers", () => {
    const map = empty();
    map.love.push({ id: "secret-id", fieldId: "love", label: "Piano & painting", notes: "Private memory", createdAt: 1, positionSeed: 0.5 });
    const journal = createJournal(map, analyzeCenter(map).insight, new Date(2026, 9, 7));
    expect(journal.fields[0].labels).toEqual(["Piano & painting"]);
    expect(journal.filename).toBe("locus-reflection-2026-10-07.pdf");
    expect(JSON.stringify(journal)).not.toContain("Private memory");
    expect(JSON.stringify(journal)).not.toContain("secret-id");
  });
  it("bounds long maps honestly and does not mutate their order or delete anything", () => {
    const map = empty();
    map.paid = Array.from({ length: 20 }, (_, i) => ({ id: String(i), fieldId: "paid", label: `Reflection ${i}`, createdAt: i, positionSeed: 0.2 }));
    const before = JSON.stringify(map);
    const journal = createJournal(map, analyzeCenter(map).insight);
    expect(journal.fields[3].labels).toHaveLength(6);
    expect(journal.fields[3].omitted).toBe(14);
    expect(journal.total).toBe(20);
    expect(JSON.stringify(map)).toBe(before);
  });
  it("supports partial maps without inventing reflections", () => {
    const map = empty();
    const journal = createJournal(map, analyzeCenter(map).insight);
    expect(journal.total).toBe(0);
    expect(journal.fields.every((f) => f.labels.length === 0)).toBe(true);
  });
  it("wraps long words and non-Latin text within measured width", () => {
    for (const input of ["W".repeat(40), "写作让我找到自己的节奏".repeat(4), "Hello world <script> & friends"]) {
      const lines = wrapText(input, 10, (v) => Array.from(v).length);
      expect(lines.every((line) => Array.from(line).length <= 10)).toBe(true);
      expect(lines.join("").replace(/\s/g, "")).toBe(input.replace(/\s/g, ""));
    }
  });
});
