import { capabilityRules } from "./capabilityInference";
import { ontologyById, ontologyThemes } from "./ontology";
import { editDistanceWithinOne, normalizeText, normalizeWord } from "./normalize";
import { isNegatedMatch, matchSemanticTheme } from "./semanticSimilarity";
import type { FieldReflections } from "../ikigai-alpha/types";
import type { InsightDimension, SignalEvidence } from "./types";

const sourceWeights = { label: 1, notes: 0.48 } as const;

function excerptFor(value: string, fallback: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return fallback;
  return trimmed.length > 92 ? `${trimmed.slice(0, 89)}...` : trimmed;
}

function aliasCandidates(alias: string) {
  const normalized = normalizeText(alias);
  if (normalized.words.length > 1) return [normalized.words.join(" ")];
  return normalized.words;
}

function matchAlias(alias: string, text: ReturnType<typeof normalizeText>) {
  const normalizedAlias = aliasCandidates(alias);
  const phraseSignals = new Set(text.phrases);
  const wordSignals = new Set(text.words);

  for (const candidate of normalizedAlias) {
    if (candidate.includes(" ") && phraseSignals.has(candidate)) return { confidence: 1.12, excerpt: candidate };
  }
  for (const candidate of normalizedAlias) {
    if (!candidate.includes(" ") && wordSignals.has(candidate)) return { confidence: 0.78, excerpt: candidate };
  }
  for (const candidate of normalizedAlias) {
    if (!candidate.includes(" ") && candidate.length >= 5 && text.words.some((word) => editDistanceWithinOne(candidate, word))) {
      return { confidence: 0.56, excerpt: candidate };
    }
  }
  return null;
}

function matchChineseAlias(alias: string, text: ReturnType<typeof normalizeText>) {
  if (!alias) return false;
  return text.chineseTokens.some((token) => token.includes(alias) || alias.includes(token));
}

function matchCapabilityCue(cue: string, text: ReturnType<typeof normalizeText>) {
  const candidates = aliasCandidates(cue);
  return candidates.find((candidate) => candidate.includes(" ") ? text.phrases.includes(candidate) : text.words.includes(candidate));
}

function evidenceForDimension(
  reflectionId: string,
  fieldId: SignalEvidence["fieldId"],
  themeId: string,
  dimension: InsightDimension,
  source: "label" | "notes",
  confidence: number,
  excerpt: string,
  inference?: SignalEvidence["inference"],
): SignalEvidence {
  return { reflectionId, fieldId, themeId, dimension, source, confidence: Number(confidence.toFixed(3)), excerpt, inference };
}

export function extractSignals(reflections: FieldReflections): SignalEvidence[] {
  const evidence: SignalEvidence[] = [];

  Object.values(reflections).flat().forEach((reflection) => {
    (["label", "notes"] as const).forEach((source) => {
      const raw = source === "label" ? reflection.label : reflection.notes ?? "";
      if (!raw.trim()) return;
      const normalized = normalizeText(raw);
      const seen = new Set<string>();

      ontologyThemes.forEach((theme) => {
        let best: { confidence: number; excerpt: string } | null = null;

        [...theme.aliases].sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length).forEach((alias) => {
          const match = matchAlias(alias, normalized);
          if (match && (!best || match.confidence > best.confidence)) best = match;
        });

        const chineseAlias = !best ? theme.chineseAliases?.find((alias) => matchChineseAlias(alias, normalized)) : undefined;
        if (!best && chineseAlias) {
          best = { confidence: 0.95, excerpt: chineseAlias };
        }

        if (!best || isNegatedMatch(raw, best.excerpt)) return;

        const baseConfidence = Math.min(1, best.confidence * sourceWeights[source]);
        theme.dimensions.forEach((dimension) => {
          const key = `${theme.id}:${dimension}:${source}`;
          if (seen.has(key)) return;
          seen.add(key);
          evidence.push(evidenceForDimension(reflection.id, reflection.fieldId, theme.id, dimension, source, baseConfidence, best?.excerpt ?? excerptFor(raw, theme.label)));
        });
      });

      capabilityRules.forEach((rule) => {
        const matchedCue = rule.cues.map((cue) => matchCapabilityCue(cue, normalized)).find(Boolean);
        if (!matchedCue || isNegatedMatch(raw, matchedCue)) return;
        rule.inferred.forEach((inference) => {
          const theme = ontologyById[inference.themeId];
          if (!theme) return;
          theme.dimensions.forEach((dimension) => {
            const key = `${theme.id}:${dimension}:${source}`;
            if (seen.has(key)) return;
            seen.add(key);
            evidence.push(evidenceForDimension(
              reflection.id,
              reflection.fieldId,
              theme.id,
              dimension,
              source,
              inference.confidence * sourceWeights[source],
              matchedCue,
              "transferable-skill",
            ));
          });
        });
      });

      const semanticMatch = matchSemanticTheme(raw);
      if (semanticMatch) {
        const theme = ontologyById[semanticMatch.themeId];
        const alreadyMatched = [...seen].some((key) => key.startsWith(`${semanticMatch.themeId}:`));
        if (theme && !alreadyMatched) {
          const semanticSourceWeight = source === "label" ? 1 : 0.8;
          theme.dimensions.forEach((dimension) => {
            const key = `${theme.id}:${dimension}:${source}`;
            if (seen.has(key)) return;
            seen.add(key);
            evidence.push(evidenceForDimension(
              reflection.id,
              reflection.fieldId,
              theme.id,
              dimension,
              source,
              semanticMatch.confidence * semanticSourceWeight,
              excerptFor(raw, theme.label),
              "semantic-prototype",
            ));
          });
        }
      }

      normalized.meaningfulKeywords.forEach((keyword) => {
        const normalizedKeyword = normalizeWord(keyword);
        if (normalizedKeyword.length < 5) return;
        if (ontologyThemes.some((theme) => theme.aliases.some((alias) => aliasCandidates(alias).includes(normalizedKeyword)))) return;
        const themeId = `keyword:${normalizedKeyword}`;
        if (seen.has(themeId)) return;
        seen.add(themeId);
        evidence.push(evidenceForDimension(reflection.id, reflection.fieldId, themeId, "activity", source, source === "label" ? 0.34 : 0.14, normalizedKeyword));
      });
    });
  });

  return evidence;
}
