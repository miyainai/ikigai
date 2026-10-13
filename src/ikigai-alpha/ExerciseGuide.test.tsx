import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExerciseGuide } from "./ExerciseGuide";
import type { FieldReflections } from "./types";

const empty: FieldReflections = { love: [], ability: [], meaning: [], paid: [] };
describe("first-time reflection guide", () => {
  it("explains the purpose and all four steps before any input", () => {
    const html = renderToStaticMarkup(<ExerciseGuide reflections={empty} onChooseField={() => {}} />);
    expect(html).toContain("The purpose");
    expect(html).toContain("Start with what you love");
    expect(html).toContain('aria-expanded="true"');
    expect(html.match(/<li>/g)).toHaveLength(4);
    expect(html).toContain("Save one thought at a time");
    expect(html).not.toContain("Notes are optional");
    expect(html).toContain("download your reflection");
    expect(html.match(/Not yet explored/g)).toHaveLength(4);
  });
  it("keeps guidance available without expanding it for a returning map", () => {
    const reflections: FieldReflections = { ...empty, ability: [{ id: "test", fieldId: "ability", label: "Explaining fractions", createdAt: 1, positionSeed: 1 }] };
    const html = renderToStaticMarkup(<ExerciseGuide reflections={reflections} onChooseField={() => {}} />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("<ol");
    expect(html).not.toContain("Start with what you love");
    expect(html).toContain("How this exercise works");
    expect(html).not.toContain("Choose a reflection field");
  });
});
