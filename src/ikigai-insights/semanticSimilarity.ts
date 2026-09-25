import { normalizeText, normalizeWord } from "./normalize";
import { semanticConceptAliases, semanticThemePrototypes } from "./semanticPrototypes";

const negators = new Set(["not", "never", "no", "without", "avoid", "avoiding", "dislike", "dislikes", "disliked", "hate", "hates", "hated", "dont", "doesnt", "didnt"]);

function rawWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeWord);
}

export function isNegatedMatch(value: string, matchedTerm: string) {
  if (/[\u4e00-\u9fff]/u.test(matchedTerm)) {
    const index = value.indexOf(matchedTerm);
    if (index < 0) return false;
    return /(?:不|不要|并不|从不|讨厌|避免).{0,5}$/u.test(value.slice(Math.max(0, index - 8), index));
  }

  const words = rawWords(value);
  const target = normalizeText(matchedTerm).words;
  if (!target.length) return false;
  const index = words.findIndex((word) => word === target[0]);
  if (index < 0) return false;
  return words.slice(Math.max(0, index - 4), index).some((word, offset, preceding) => {
    if (!negators.has(word)) return false;
    return !(word === "not" && preceding[offset + 1] === "only");
  });
}

const phraseConcept = new Map<string, string>();
const wordConcept = new Map<string, string>();

Object.entries(semanticConceptAliases).forEach(([concept, aliases]) => {
  aliases.forEach((alias) => {
    const normalized = normalizeText(alias);
    normalized.phrases.forEach((phrase) => phraseConcept.set(phrase, concept));
    if (normalized.words.length === 1) wordConcept.set(normalized.words[0], concept);
  });
});

function rawFeatures(value: string) {
  const normalized = normalizeText(value);
  const features = new Map<string, number>();

  normalized.words.forEach((word) => {
    const feature = wordConcept.get(word) ?? word;
    features.set(feature, Math.max(features.get(feature) ?? 0, 1));
  });
  normalized.phrases.forEach((phrase) => {
    const feature = phraseConcept.get(phrase) ?? phrase;
    features.set(feature, Math.max(features.get(feature) ?? 0, phrase.split(" ").length === 3 ? 1.35 : 1.2));
  });
  return features;
}

const prototypeRows = semanticThemePrototypes.flatMap((theme) => theme.examples.map((example) => ({
  themeId: theme.themeId,
  features: rawFeatures(example),
})));
const vocabulary = new Set(prototypeRows.flatMap((row) => [...row.features.keys()]));
const documentFrequency = new Map<string, number>();

prototypeRows.forEach((row) => {
  row.features.forEach((_, feature) => documentFrequency.set(feature, (documentFrequency.get(feature) ?? 0) + 1));
});

function weightedFeatures(value: string) {
  const features = rawFeatures(value);
  const weighted = new Map<string, number>();
  features.forEach((weight, feature) => {
    if (!vocabulary.has(feature)) return;
    const idf = Math.log((prototypeRows.length + 1) / ((documentFrequency.get(feature) ?? 0) + 1)) + 1;
    weighted.set(feature, weight * idf);
  });
  return weighted;
}

function cosine(left: Map<string, number>, right: Map<string, number>) {
  let dot = 0;
  let leftLength = 0;
  let rightLength = 0;
  left.forEach((value, key) => {
    leftLength += value * value;
    dot += value * (right.get(key) ?? 0);
  });
  right.forEach((value) => {
    rightLength += value * value;
  });
  if (!leftLength || !rightLength) return 0;
  return dot / Math.sqrt(leftLength * rightLength);
}

const weightedPrototypeRows = semanticThemePrototypes.flatMap((theme) => theme.examples.map((example) => ({
  themeId: theme.themeId,
  features: weightedFeatures(example),
})));

export interface SemanticThemeMatch {
  themeId: string;
  confidence: number;
  similarity: number;
}

export function matchSemanticTheme(value: string): SemanticThemeMatch | null {
  const sourceWords = rawWords(value);
  if (sourceWords.some((word, index) => negators.has(word) && !(word === "not" && sourceWords[index + 1] === "only"))) return null;
  const input = weightedFeatures(value);
  if (input.size < 2) return null;

  const scores = new Map<string, number>();
  weightedPrototypeRows.forEach((row) => {
    scores.set(row.themeId, Math.max(scores.get(row.themeId) ?? 0, cosine(input, row.features)));
  });
  const ranked = [...scores].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const [best, runnerUp] = ranked;
  if (!best || best[1] < 0.5 || best[1] - (runnerUp?.[1] ?? 0) < 0.07) return null;

  return {
    themeId: best[0],
    similarity: Number(best[1].toFixed(3)),
    confidence: Number(Math.min(0.66, 0.4 + (best[1] - 0.5) * 0.72).toFixed(3)),
  };
}
