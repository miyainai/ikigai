import { extractSignals } from "../ikigai-insights/extractSignals";
import { generateComprehensiveIkigaiInsight } from "../ikigai-insights/generateInsight";
import { normalizeText } from "../ikigai-insights/normalize";
import { ontologyById } from "../ikigai-insights/ontology";
import { scoreSignals } from "../ikigai-insights/scoreSignals";
import { readinessLabel } from "../ikigai-insights/templates";
import type { CenterAnalysis, FieldId, FieldReflections, ThemeInsight } from "./types";

const fieldIds: FieldId[] = ["love", "ability", "meaning", "paid"];

export function normalizeContent(value: string) {
  const normalized = normalizeText(value);
  return { unigrams: normalized.words, phrases: normalized.phrases };
}

export function mapContentToThemes(value: string) {
  const empty: FieldReflections = { love: [{ id: "temp", fieldId: "love", label: value, createdAt: 0, positionSeed: 0 }], ability: [], meaning: [], paid: [] };
  return [...new Set(extractSignals(empty).map((item) => item.themeId.startsWith("keyword:") ? item.themeId : ontologyById[item.themeId]?.parentId ?? item.themeId))];
}

export function scoreThemes(reflections: FieldReflections) {
  return scoreSignals(extractSignals(reflections)).map((signal) => ({
    name: signal.id,
    fields: signal.fields,
    reflectionIds: [...new Set(signal.evidence.map((item) => item.reflectionId))].sort(),
    reflectionCount: signal.reflectionCount,
    weightedFieldCoverage: signal.fields.length,
    score: signal.score,
  } satisfies ThemeInsight & { reflectionCount: number; weightedFieldCoverage: number; score: number }));
}

export function convergenceStatus(populatedFields: number, totalReflections: number, crossFieldThemes: number) {
  if (totalReflections <= 1) return "Still forming";
  if (populatedFields <= 1 || totalReflections < 5) return "Early signals";
  if (populatedFields === 4 && totalReflections >= 10 && crossFieldThemes >= 3) return "Strong convergence";
  return "Patterns emerging";
}

function simpleIntersections(comprehensive: ReturnType<typeof generateComprehensiveIkigaiInsight>) {
  return {
    passion: comprehensive.intersections.passion?.map((item) => item.themeIds[0]),
    mission: comprehensive.intersections.mission?.map((item) => item.themeIds[0]),
    profession: comprehensive.intersections.profession?.map((item) => item.themeIds[0]),
    vocation: comprehensive.intersections.vocation?.map((item) => item.themeIds[0]),
    core: comprehensive.intersections.core?.map((item) => item.themeIds[0]),
  };
}

export function generateLocalIkigaiInsight(reflections: FieldReflections) {
  const comprehensive = generateComprehensiveIkigaiInsight(reflections);
  return {
    status: readinessLabel(comprehensive.readiness.state),
    themes: comprehensive.topThemes.map((theme) => ({
      name: theme.label,
      fields: theme.fields,
      reflectionIds: [...new Set(theme.evidence.map((item) => item.reflectionId))].sort(),
    })),
    statement: comprehensive.statement,
    intersections: simpleIntersections(comprehensive),
    missingSignals: comprehensive.missingSignals[0]?.explanation,
    directions: comprehensive.directions.map((direction) => direction.explanation),
    experiment: comprehensive.experiment.description,
    comprehensive,
  };
}

export function analyzeCenter(reflections: FieldReflections): CenterAnalysis {
  const populatedFields = fieldIds.filter((fieldId) => reflections[fieldId].length > 0);
  const totalReflections = fieldIds.reduce((total, fieldId) => total + reflections[fieldId].length, 0);
  const insight = generateLocalIkigaiInsight(reflections);
  const crossFieldThemes = insight.comprehensive.topThemes.filter((theme) => theme.fields.length >= 2).length;
  return {
    coverage: populatedFields.length / 4,
    density: Math.min(totalReflections / 12, 1),
    overlap: Math.min(crossFieldThemes / 4, 1),
    populatedFields,
    totalReflections,
    recurringThemes: insight.comprehensive.topThemes.filter((theme) => theme.fields.length >= 2).map((theme) => theme.label).slice(0, 6),
    insight,
  };
}
