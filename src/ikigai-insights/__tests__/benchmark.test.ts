import { describe, expect, it } from "vitest";
import { extractSignals } from "../extractSignals";
import { generateComprehensiveIkigaiInsight } from "../generateInsight";
import { ontologyById } from "../ontology";
import type { FieldReflections, Reflection } from "../../ikigai-alpha/types";
import { benchmarkProfiles } from "./benchmarkProfiles";

function singleAbility(label: string): FieldReflections {
  const reflection: Reflection = {
    id: "skill-example",
    fieldId: "ability",
    label,
    createdAt: 1,
    positionSeed: 0.4,
  };
  return { love: [], ability: [reflection], meaning: [], paid: [] };
}

function isSemanticMatch(expectedId: string, returnedId: string) {
  if (expectedId === returnedId) return true;
  const expected = ontologyById[expectedId];
  const returned = ontologyById[returnedId];
  if (!expected || !returned) return false;
  if (expected.parentId === returnedId || returned.parentId === expectedId) return true;
  return Boolean(expected.relatedThemeIds?.includes(returnedId) || returned.relatedThemeIds?.includes(expectedId));
}

describe("transferable capability inference", () => {
  it.each(["Good at math", "Working with numbers", "Mental calculation", "Calculating odds"])(
    "recognizes quantitative capability from %s",
    (label) => {
      expect(extractSignals(singleAbility(label)).some((item) => item.themeId === "quantitative-reasoning")).toBe(true);
    },
  );

  it("maps quantitative hobbies to cautious quantitative and strategic evidence", () => {
    const evidence = extractSignals(singleAbility("Calculating poker odds and probabilities"));
    expect(evidence.map((item) => item.themeId)).toEqual(expect.arrayContaining([
      "quantitative-reasoning",
      "pattern-recognition",
      "strategy",
    ]));
    expect(evidence.find((item) => item.themeId === "pattern-recognition")?.inference).toBe("transferable-skill");
  });

  it("maps artistic practice to creative capability and disciplined practice", () => {
    const evidence = extractSignals(singleAbility("Playing piano and making art"));
    expect(evidence.map((item) => item.themeId)).toEqual(expect.arrayContaining([
      "artistic-performance",
      "creative-thinking",
      "disciplined-practice",
    ]));
  });

  it("does not award an identity-level role from only one hobby reflection", () => {
    const insight = generateComprehensiveIkigaiInsight(singleAbility("I enjoy playing piano"));
    expect(insight.emergingRoles).toHaveLength(0);
  });
});

describe("realistic profile benchmark", () => {
  const results = benchmarkProfiles.map((profile) => {
    const insight = generateComprehensiveIkigaiInsight(profile.reflections);
    const returnedThemes = insight.topThemes.map((theme) => theme.id);
    const themeHits = profile.expectedThemes.filter((theme) => returnedThemes.some((returned) => isSemanticMatch(theme, returned)));
    const returnedRoles = insight.emergingRoles.map((role) => role.role);
    const roleHit = !profile.expectedRoles?.length || profile.expectedRoles.some((role) => returnedRoles.includes(role));
    return {
      id: profile.id,
      themeRecall: themeHits.length / profile.expectedThemes.length,
      missedThemes: profile.expectedThemes.filter((theme) => !returnedThemes.some((returned) => isSemanticMatch(theme, returned))),
      returnedThemes,
      expectedRoles: profile.expectedRoles ?? [],
      returnedRoles,
      roleHit,
    };
  });

  it("covers at least 80% of expected themes across the benchmark", () => {
    const recall = results.reduce((sum, result) => sum + result.themeRecall, 0) / results.length;
    expect(recall, JSON.stringify(results.filter((result) => result.themeRecall < 1), null, 2)).toBeGreaterThanOrEqual(0.8);
  });

  it("avoids completely missing any representative profile", () => {
    const misses = results.filter((result) => result.themeRecall === 0);
    expect(misses, JSON.stringify(misses, null, 2)).toHaveLength(0);
  });

  it("keeps displayed recurring themes backed by multiple reflections", () => {
    benchmarkProfiles.forEach((profile) => {
      const insight = generateComprehensiveIkigaiInsight(profile.reflections);
      expect(insight.recurringThemes.every((theme) => theme.evidenceReflectionIds.length >= 2)).toBe(true);
    });
  });

  it("is deterministic across the full benchmark", () => {
    benchmarkProfiles.forEach((profile) => {
      expect(generateComprehensiveIkigaiInsight(profile.reflections)).toEqual(generateComprehensiveIkigaiInsight(profile.reflections));
    });
  });
});
