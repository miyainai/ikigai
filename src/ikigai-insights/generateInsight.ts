import { fieldsById } from "../ikigai-alpha/fieldConfig";
import type { FieldId, FieldReflections } from "../ikigai-alpha/types";
import { detectPatterns } from "./detectPatterns";
import { extractSignals } from "./extractSignals";
import { ontologyById } from "./ontology";
import { scoreSignals } from "./scoreSignals";
import { buildStatement, directionFromSignal, experimentFromSignal, readinessCopy } from "./templates";
import type { ComprehensiveIkigaiInsight, ScoredSignal } from "./types";

const fieldIds = ["love", "ability", "meaning", "paid"] as const;

function isTrustworthyTheme(signal: ScoredSignal) {
  if (signal.id.startsWith("keyword:")) return false;
  const directReflectionIds = new Set(signal.evidence.filter((item) => !item.inference).map((item) => item.reflectionId));
  const allReflectionIds = new Set(signal.evidence.map((item) => item.reflectionId));
  if (directReflectionIds.size === 0 && allReflectionIds.size < 3) return false;

  const theme = ontologyById[signal.id];
  if (!theme || theme.parentId) return true;
  const hasDirectParentEvidence = signal.evidence.some((item) => item.themeId === signal.id && !item.inference);
  const hasSpecificChildSignal = signal.evidence.some((item) => ontologyById[item.themeId]?.parentId === signal.id);
  return hasDirectParentEvidence || !hasSpecificChildSignal;
}

function signalEvidenceIds(signal: ScoredSignal) {
  return [...new Set(signal.evidence.map((item) => item.reflectionId))].sort();
}

function buildTakeaway(topSignals: ScoredSignal[], recurringThemes: ReturnType<typeof detectPatterns>["recurringThemes"]) {
  const recurring = recurringThemes[0];
  if (recurring) {
    const signal = topSignals.find((candidate) => recurring.themeIds.includes(candidate.id));
    const fieldNames = signal?.fields.map((fieldId) => fieldsById[fieldId].emphasis.toLowerCase()).join(" and ");
    return {
      title: `${recurring.title} keeps returning`,
      explanation: fieldNames
        ? `It appears across ${fieldNames}. That repetition is worth testing as a direction, not treating as a final answer.`
        : "This theme is supported by several reflections. It is worth testing as a direction, not treating as a final answer.",
      evidenceReflectionIds: recurring.evidenceReflectionIds,
    };
  }

  const earlySignal = topSignals.find((signal) => signal.evidence.some((item) => !item.inference));
  if (earlySignal) {
    const fieldNames = earlySignal.fields.map((fieldId) => fieldsById[fieldId].emphasis.toLowerCase()).join(" and ");
    return {
      title: `${earlySignal.label} is an early signal`,
      explanation: `It currently appears around ${fieldNames}, but has not repeated enough to call it a pattern yet.`,
      evidenceReflectionIds: signalEvidenceIds(earlySignal),
    };
  }

  return {
    title: "Start with one real moment",
    explanation: "Specific experiences reveal more than broad traits. Add something you did, noticed, or kept returning to.",
    evidenceReflectionIds: [],
  };
}

function buildNextStep(reflections: FieldReflections, topSignals: ScoredSignal[], recurringThemeCount: number) {
  const rankedFields = [...fieldIds].sort((left, right) => reflections[left].length - reflections[right].length || fieldIds.indexOf(left) - fieldIds.indexOf(right));
  const nextField = rankedFields[0] as FieldId;
  const strongest = topSignals.find((signal) => signal.evidence.some((item) => !item.inference));

  if (reflections[nextField].length === 0) {
    return {
      title: `Explore ${fieldsById[nextField].panelTitle.toLowerCase()}`,
      prompt: fieldsById[nextField].prompt,
      fieldId: nextField,
    };
  }

  if (recurringThemeCount > 0 && strongest) {
    return {
      title: `Test the ${strongest.label.toLowerCase()} signal`,
      prompt: `Where could you try one small version of ${strongest.label.toLowerCase()} this week, and what would you notice?`,
    };
  }

  return {
    title: "Look for a second signal",
    prompt: strongest
      ? `Does ${strongest.label.toLowerCase()} show up elsewhere in your life? Add it only if a concrete example comes to mind.`
      : fieldsById[nextField].prompt,
    fieldId: nextField,
  };
}

export function generateComprehensiveIkigaiInsight(reflections: FieldReflections): ComprehensiveIkigaiInsight {
  const evidence = extractSignals(reflections);
  const scored = scoreSignals(evidence);
  const patterns = detectPatterns(scored, reflections);
  const populatedFields = fieldIds.filter((fieldId) => reflections[fieldId].length > 0).length;
  const totalReflections = fieldIds.reduce((sum, fieldId) => sum + reflections[fieldId].length, 0);
  const trustworthySignals = scored.filter(isTrustworthyTheme);
  const multiFieldThemes = patterns.recurringThemes.length;
  const readiness = readinessCopy(populatedFields, totalReflections, multiFieldThemes);
  const strongestRole = patterns.emergingRoles[0]?.role;
  const topSignals = trustworthySignals.slice(0, 8);
  const takeaway = buildTakeaway(topSignals, patterns.recurringThemes);
  const nextStep = buildNextStep(reflections, topSignals, patterns.recurringThemes.length);
  const directions = [
    ...patterns.complementaryPatterns.slice(0, 1).map((item) => ({
      title: item.title,
      explanation: item.explanation,
      supportingThemeIds: item.themeIds,
      evidenceReflectionIds: item.evidenceReflectionIds,
    })),
    ...topSignals.filter((signal) => signal.fields.length >= 2).slice(0, 3).map(directionFromSignal),
  ].filter((direction, index, all) => all.findIndex((candidate) => candidate.title === direction.title) === index).slice(0, 3);

  const headline = topSignals.length
    ? `Signals around ${topSignals.slice(0, 2).map((signal) => signal.label.toLowerCase()).join(" and ")}`
    : "Signals are still forming";

  return {
    readiness,
    progress: {
      exploredFields: populatedFields,
      totalFields: fieldIds.length,
      totalReflections,
      recurringThemeCount: patterns.recurringThemes.length,
    },
    takeaway,
    nextStep,
    headline,
    statement: buildStatement(topSignals, strongestRole),
    topThemes: topSignals.map((signal) => ({
      id: signal.id,
      label: signal.label,
      dimensions: signal.dimensions,
      fields: signal.fields,
      evidence: signal.evidence,
      confidence: signal.confidence,
    })),
    recurringThemes: patterns.recurringThemes,
    emergingRoles: patterns.emergingRoles,
    intersections: patterns.intersections,
    complementaryPatterns: patterns.complementaryPatterns,
    tensions: patterns.tensions,
    missingSignals: patterns.missingSignals,
    directions: directions.length ? directions : topSignals.slice(0, 2).map(directionFromSignal),
    experiment: experimentFromSignal(topSignals[0]),
  };
}
