import { describe, expect, it } from "vitest";
import { detectPatterns } from "../detectPatterns";
import { extractSignals } from "../extractSignals";
import { generateComprehensiveIkigaiInsight } from "../generateInsight";
import { normalizeText } from "../normalize";
import { scoreSignals } from "../scoreSignals";
import { matchSemanticTheme } from "../semanticSimilarity";
import type { FieldId, FieldReflections, Reflection } from "../../ikigai-alpha/types";

function reflection(id: string, fieldId: FieldId, label: string, notes = ""): Reflection {
  return { id, fieldId, label, notes: notes || undefined, createdAt: 1, positionSeed: 0.42 };
}

function emptyFields(): FieldReflections {
  return { love: [], ability: [], meaning: [], paid: [] };
}

function profile(items: Reflection[]) {
  const fields = emptyFields();
  items.forEach((item) => fields[item.fieldId].push(item));
  return fields;
}

const builderProfile = profile([
  reflection("b-love", "love", "Building useful products", "I lose time prototyping tools and designing clean interfaces."),
  reflection("b-ability", "ability", "Making prototypes clear", "People ask me to turn messy ideas into working systems."),
  reflection("b-meaning", "meaning", "Better access for users", "I care about tools that lower barriers for consumers and students."),
  reflection("b-paid", "paid", "Shipping digital products", "Teams pay for reliable execution and product design."),
]);

const teacherProfile = profile([
  reflection("t-love", "love", "Teaching through stories", "Explaining ideas and seeing students gain confidence energizes me."),
  reflection("t-ability", "ability", "Mentoring young people", "People ask me to coach, guide, and break down complicated topics."),
  reflection("t-meaning", "meaning", "Helping learners feel capable", "I care about learning, confidence, and access."),
  reflection("t-paid", "paid", "Training teams", "Organizations pay for workshops and education."),
]);

const analystProfile = profile([
  reflection("a-love", "love", "Researching patterns", "I enjoy investigating why people make decisions."),
  reflection("a-ability", "ability", "Analyzing messy data", "People ask me for synthesis, judgment, and strategic recommendations."),
  reflection("a-meaning", "meaning", "Better decisions", "I care about clarity for professionals and teams."),
  reflection("a-paid", "paid", "Strategy advisory", "Clients pay for analysis, prioritization, and roadmaps."),
]);

const connectorProfile = profile([
  reflection("c-love", "love", "Connecting people", "I love hosting gatherings where creators feel belonging."),
  reflection("c-ability", "ability", "Building trust", "People ask me to introduce teams and make collaboration easier."),
  reflection("c-meaning", "meaning", "Local community", "I care about belonging and opportunity in local communities."),
  reflection("c-paid", "paid", "Community partnerships", "Organizations value relationship building and events."),
]);

describe("normalization", () => {
  it("normalizes English variants and multi-word phrases", () => {
    const normalized = normalizeText("BUILDING useful things, making sense, and better decisions.");
    expect(normalized.words).toEqual(expect.arrayContaining(["build", "useful", "make", "sense", "better", "decision"]));
    expect(normalized.phrases).toContain("better decision");
    expect(normalized.words).not.toContain("and");
  });

  it("preserves Chinese tokens for alias matching", () => {
    const evidence = extractSignals(profile([reflection("cn", "love", "我喜欢设计和教学", "帮助学生更有自信。")]));
    expect(evidence.map((item) => item.themeId)).toEqual(expect.arrayContaining(["designing", "teaching", "students", "confidence"]));
  });
});

describe("signal extraction and scoring", () => {
  it("matches a paraphrase against a bundled semantic prototype", () => {
    expect(matchSemanticTheme("Turning messy information into one coherent picture")?.themeId).toBe("synthesis");
  });

  it("does not treat a negated activity as positive evidence", () => {
    const evidence = extractSignals(profile([reflection("negative", "love", "I do not enjoy teaching")]));
    expect(evidence.some((item) => item.themeId === "teaching"), JSON.stringify(evidence, null, 2)).toBe(false);
  });

  it("keeps one semantic match below the visible insight threshold", () => {
    const insight = generateComprehensiveIkigaiInsight(profile([
      reflection("semantic-one", "love", "Turning scattered information into a coherent picture"),
    ]));
    expect(insight.topThemes.some((theme) => theme.id === "synthesis")).toBe(false);
  });

  it("prioritizes multi-word phrase and label evidence over notes", () => {
    const fields = profile([reflection("x", "love", "Better decisions", "analysis analysis analysis analysis analysis")]);
    const evidence = extractSignals(fields);
    const scores = scoreSignals(evidence);
    const decisions = scores.find((signal) => signal.id === "better-decisions");
    const analysis = scores.find((signal) => signal.id === "analysis");
    expect(decisions?.evidence.some((item) => item.source === "label" && item.confidence > 0.7)).toBe(true);
    expect((decisions?.score ?? 0)).toBeGreaterThan(analysis?.score ?? 0);
  });

  it("aggregates parent and child themes without duplicate-note inflation", () => {
    const repeated = profile([reflection("r", "ability", "Planning systems", "organize organize organize organize process process process")]);
    const scores = scoreSignals(extractSignals(repeated));
    const organizing = scores.find((signal) => signal.id === "organizing");
    expect(organizing?.reflectionCount).toBe(1);
    expect(organizing?.evidence.length).toBeLessThan(8);
  });

  it("counts one reflection once even when a theme spans several dimensions", () => {
    const scores = scoreSignals(extractSignals(profile([reflection("e", "ability", "Empathy")])));
    const empathy = scores.find((signal) => signal.id === "empathy");
    expect(empathy?.reflectionCount).toBe(1);
    expect(empathy?.evidence).toHaveLength(1);
  });

  it("detects cross-field recurrence", () => {
    const scores = scoreSignals(extractSignals(builderProfile));
    expect(scores.find((signal) => signal.id === "building")?.fields.length).toBeGreaterThanOrEqual(2);
  });
});

describe("patterns", () => {
  it("detects complementary patterns and Ikigai intersections", () => {
    const scores = scoreSignals(extractSignals(builderProfile));
    const patterns = detectPatterns(scores, builderProfile);
    expect(patterns.complementaryPatterns.some((item) => item.title.includes("Building"))).toBe(true);
    expect(patterns.intersections.passion?.length).toBeGreaterThan(0);
    expect(patterns.intersections.mission?.length).toBeGreaterThan(0);
  });

  it("infers emerging roles with evidence", () => {
    const insight = generateComprehensiveIkigaiInsight(teacherProfile);
    expect(insight.emergingRoles[0]?.role).toBe("Guide");
    expect(insight.emergingRoles[0]?.evidenceReflectionIds.length).toBeGreaterThan(0);
  });

  it("does not promote one inferred capability into a recurring theme", () => {
    const insight = generateComprehensiveIkigaiInsight(profile([reflection("recruiting", "ability", "Recruiting candidates")]));
    expect(insight.recurringThemes).toHaveLength(0);
    expect(insight.topThemes.some((theme) => theme.id === "empathy")).toBe(false);
  });

  it("promotes a semantic theme only after repeated cross-field paraphrases", () => {
    const insight = generateComprehensiveIkigaiInsight(profile([
      reflection("semantic-love", "love", "Turning scattered information into a coherent picture"),
      reflection("semantic-ability", "ability", "Connecting separate ideas to find their common thread"),
      reflection("semantic-paid", "paid", "Pulling many inputs together and distilling what matters"),
    ]));
    expect(insight.recurringThemes.some((theme) => theme.title === "Synthesis"), JSON.stringify(insight.topThemes, null, 2)).toBe(true);
  });

  it("prefers a specific repeated theme over its synthesized parent", () => {
    const insight = generateComprehensiveIkigaiInsight(profile([
      reflection("build-love", "love", "Building useful products"),
      reflection("build-paid", "paid", "Building useful tools"),
    ]));
    expect(insight.recurringThemes.some((theme) => theme.title === "Building")).toBe(true);
    expect(insight.topThemes.some((theme) => theme.id === "creating")).toBe(false);
  });

  it("does not fabricate an intersection from merely related themes", () => {
    const fields = profile([
      reflection("help-love", "love", "Helping people"),
      reflection("access-meaning", "meaning", "Improving access"),
    ]);
    const patterns = detectPatterns(scoreSignals(extractSignals(fields)), fields);
    expect(patterns.intersections.mission).toHaveLength(0);
  });

  it("detects cautious tensions and missing signals", () => {
    const sparse = profile([
      reflection("l1", "love", "Exploring freedom"),
      reflection("l2", "love", "Independent creative work"),
      reflection("p1", "paid", "Stable operations"),
      reflection("p2", "paid", "Reliable structured work"),
    ]);
    const insight = generateComprehensiveIkigaiInsight(sparse);
    expect(insight.tensions.length).toBeGreaterThan(0);
    expect(insight.missingSignals.length).toBeGreaterThan(0);
  });
});

describe("deterministic insights", () => {
  it("keeps every generated evidence-based section traceable", () => {
    const insight = generateComprehensiveIkigaiInsight(builderProfile);
    expect(insight.topThemes.every((theme) => theme.evidence.length > 0)).toBe(true);
    expect(insight.directions.every((direction) => direction.evidenceReflectionIds.length > 0)).toBe(true);
    expect(insight.emergingRoles.every((role) => role.evidenceReflectionIds.length > 0)).toBe(true);
  });

  it("returns identical output for identical reflections", () => {
    expect(generateComprehensiveIkigaiInsight(analystProfile)).toEqual(generateComprehensiveIkigaiInsight(analystProfile));
  });

  it("handles sparse input cautiously", () => {
    const insight = generateComprehensiveIkigaiInsight(profile([reflection("one", "love", "Long walks")]));
    expect(insight.readiness.state).toBe("still-forming");
    expect(insight.statement).toContain("still forming");
    expect(insight.progress).toMatchObject({ exploredFields: 1, totalReflections: 1 });
    expect(insight.nextStep.fieldId).toBe("ability");
  });

  it("provides a useful takeaway before strong convergence", () => {
    const insight = generateComprehensiveIkigaiInsight(profile([
      reflection("one", "love", "Building small tools"),
      reflection("two", "ability", "Building clear prototypes"),
    ]));
    expect(insight.takeaway.title).toContain("Building");
    expect(insight.takeaway.evidenceReflectionIds).toEqual(["one", "two"]);
  });

  it("reaches strong convergence with four explored fields and repeated evidence", () => {
    const insight = generateComprehensiveIkigaiInsight(profile([
      reflection("l1", "love", "Building useful tools"),
      reflection("l2", "love", "Helping people learn"),
      reflection("a1", "ability", "Building clear prototypes"),
      reflection("a2", "ability", "Helping teams"),
      reflection("m1", "meaning", "Building better access"),
      reflection("m2", "meaning", "Helping learners"),
      reflection("p1", "paid", "Building digital products"),
      reflection("p2", "paid", "Helping clients"),
    ]));
    expect(insight.readiness.state).toBe("strong-convergence");
    expect(insight.progress.recurringThemeCount).toBeGreaterThanOrEqual(2);
  });

  it("produces meaningfully different fixture profiles", () => {
    const roles = [
      generateComprehensiveIkigaiInsight(builderProfile).emergingRoles[0]?.role,
      generateComprehensiveIkigaiInsight(teacherProfile).emergingRoles[0]?.role,
      generateComprehensiveIkigaiInsight(analystProfile).emergingRoles[0]?.role,
      generateComprehensiveIkigaiInsight(connectorProfile).emergingRoles[0]?.role,
    ];
    expect(new Set(roles).size).toBe(4);
    expect(roles).toEqual(["Builder", "Guide", "Strategist", "Connector"]);
  });
});
