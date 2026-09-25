import type { NormalizedText } from "./types";

const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "because", "been", "being", "but", "by", "can", "could", "did", "do", "does", "doing", "for", "from", "had", "has", "have", "having", "how", "i", "if", "in", "into", "is", "it", "its", "just", "kind", "like", "me", "more", "my", "of", "on", "or", "our", "really", "so", "some", "that", "the", "their", "them", "then", "there", "these", "they", "this", "those", "through", "to", "too", "very", "was", "we", "what", "when", "where", "which", "while", "who", "with", "would", "you", "your",
  "about", "again", "also", "enough", "feel", "feels", "felt", "lot", "much", "people", "person", "thing", "things", "time", "want", "way", "work",
]);

const variants: Record<string, string> = {
  analyses: "analysis",
  analyzed: "analyze",
  analyzing: "analyze",
  builders: "builder",
  building: "build",
  built: "build",
  calculated: "calculate",
  calculating: "calculate",
  children: "child",
  coached: "coach",
  coaching: "coach",
  communicated: "communicate",
  communicating: "communicate",
  communities: "community",
  connected: "connect",
  connecting: "connect",
  created: "create",
  creating: "create",
  designed: "design",
  designing: "design",
  explained: "explain",
  explaining: "explain",
  explored: "explore",
  exploring: "explore",
  families: "family",
  founders: "founder",
  guided: "guide",
  guiding: "guide",
  helped: "help",
  helping: "help",
  learned: "learn",
  learning: "learn",
  led: "lead",
  leading: "lead",
  makers: "maker",
  making: "make",
  mentoring: "mentor",
  organized: "organize",
  organizing: "organize",
  planned: "plan",
  planning: "plan",
  professionals: "professional",
  researched: "research",
  researching: "research",
  solved: "solve",
  solving: "solve",
  stories: "story",
  students: "student",
  supported: "support",
  supporting: "support",
  taught: "teach",
  teaching: "teach",
  teams: "team",
  understood: "understand",
  understanding: "understand",
  users: "user",
  writing: "write",
  written: "write",
};

export function normalizeWord(word: string) {
  if (variants[word]) return variants[word];
  if (word.endsWith("ies") && word.length > 5) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ing") && word.length > 6) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 5) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 4) return word.slice(0, -1);
  return word;
}

export function normalizeText(value: string): NormalizedText {
  const lower = value.toLowerCase();
  const chineseTokens = [...new Set(lower.match(/[\u4e00-\u9fff]{1,8}/g) ?? [])];
  const words = lower
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/[\u4e00-\u9fff]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .map(normalizeWord)
    .filter((word) => word.length > 1 && !stopWords.has(word));

  const uniqueWords = [...new Set(words)];
  const phrases = new Set<string>();
  for (let size = 3; size >= 2; size -= 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      phrases.add(words.slice(index, index + size).join(" "));
    }
  }

  return {
    words: uniqueWords,
    phrases: [...phrases],
    chineseTokens,
    meaningfulKeywords: uniqueWords.filter((word) => word.length > 3),
  };
}

export function normalizeAlias(alias: string) {
  return normalizeText(alias).phrases[0] ?? normalizeText(alias).words.join(" ");
}

export function editDistanceWithinOne(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;
  let edits = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
    } else {
      edits += 1;
      if (edits > 1) return false;
      if (a.length > b.length) i += 1;
      else if (b.length > a.length) j += 1;
      else {
        i += 1;
        j += 1;
      }
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
