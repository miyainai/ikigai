import { ontologyById } from "./ontology";
import type { FieldId } from "../ikigai-alpha/types";
import type { InsightDimension, ScoredSignal, SignalEvidence } from "./types";

const fieldWeights: Record<FieldId, number> = { love: 1, ability: 1.12, meaning: 1.08, paid: 1.12 };

function labelFor(themeId: string) {
  if (themeId.startsWith("keyword:")) return themeId.replace("keyword:", "");
  return ontologyById[themeId]?.label ?? themeId;
}

function themeSpecificity(themeId: string) {
  if (themeId.startsWith("keyword:")) return 0.34;
  return ontologyById[themeId]?.parentId ? 1 : 0.72;
}

function aggregateEvidence(themeId: string, evidence: SignalEvidence[]) {
  const theme = ontologyById[themeId];
  const childIds = new Set<string>();
  if (theme && !theme.parentId) {
    Object.values(ontologyById).forEach((candidate) => {
      if (candidate.parentId === theme.id) childIds.add(candidate.id);
    });
  }
  return evidence.filter((item) => item.themeId === themeId || childIds.has(item.themeId));
}

function dedupeEvidence(items: SignalEvidence[]) {
  const strongest = new Map<string, SignalEvidence>();
  items.forEach((item) => {
    const key = [item.reflectionId, item.themeId, item.source, item.inference ?? "direct"].join(":");
    const current = strongest.get(key);
    if (!current || item.confidence > current.confidence) strongest.set(key, item);
  });
  return [...strongest.values()];
}

export function scoreSignals(evidence: SignalEvidence[]): ScoredSignal[] {
  const themeIds = new Set(evidence.map((item) => item.themeId));
  Object.values(ontologyById).forEach((theme) => {
    if (!theme.parentId && evidence.some((item) => ontologyById[item.themeId]?.parentId === theme.id)) themeIds.add(theme.id);
  });

  return [...themeIds].map((themeId) => {
    const items = dedupeEvidence(aggregateEvidence(themeId, evidence));
    const fields = [...new Set(items.map((item) => item.fieldId))].sort((a, b) => ["love", "ability", "meaning", "paid"].indexOf(a) - ["love", "ability", "meaning", "paid"].indexOf(b));
    const reflectionIds = new Set(items.map((item) => item.reflectionId));
    const dimensions = [...new Set((ontologyById[themeId]?.dimensions ?? items.map((item) => item.dimension)) as InsightDimension[])];
    const sourceDiversity = new Set(items.map((item) => item.source)).size;
    const specificity = themeSpecificity(themeId);
    const perReflection = new Map<string, number>();
    items.forEach((item) => {
      perReflection.set(item.reflectionId, Math.max(perReflection.get(item.reflectionId) ?? 0, item.confidence));
    });
    const evidenceScore = [...perReflection.values()].reduce((sum, value) => sum + value, 0);
    const fieldStrength = new Map<FieldId, number>();
    items.forEach((item) => {
      fieldStrength.set(item.fieldId, Math.max(fieldStrength.get(item.fieldId) ?? 0, item.confidence));
    });
    const fieldCoverage = [...fieldStrength].reduce((sum, [fieldId, strength]) => sum + fieldWeights[fieldId] * strength, 0);
    const strongFieldCount = [...fieldStrength.values()].filter((strength) => strength >= 0.48).length;
    const childDiversity = new Set(items.filter((item) => item.themeId !== themeId).map((item) => item.themeId)).size;
    const relatedChildBoost = childDiversity >= 2 ? Math.min(0.7, childDiversity * 0.18) : 0;
    const score = evidenceScore * 1.25 + fieldCoverage * 0.8 + Math.max(0, strongFieldCount - 1) * 1.4 + specificity * 0.55 + relatedChildBoost;
    const confidence = perReflection.size ? [...perReflection.values()].reduce((sum, value) => sum + value, 0) / perReflection.size : 0;

    return {
      id: themeId,
      label: labelFor(themeId),
      parentId: ontologyById[themeId]?.parentId,
      dimensions,
      score: Number(score.toFixed(3)),
      reflectionCount: reflectionIds.size,
      fields,
      evidence: items,
      sourceDiversity,
      specificity,
      confidence: Number(Math.min(1, confidence + Math.max(0, strongFieldCount - 1) * 0.04).toFixed(3)),
    };
  }).filter((signal) => signal.evidence.length > 0)
    .sort((a, b) => b.score - a.score || b.fields.length - a.fields.length || b.specificity - a.specificity || a.label.localeCompare(b.label));
}
