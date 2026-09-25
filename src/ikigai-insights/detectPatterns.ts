import { fieldsById } from "../ikigai-alpha/fieldConfig";
import type { FieldId, FieldReflections } from "../ikigai-alpha/types";
import { ontologyById } from "./ontology";
import type { InsightPatterns, PatternResult, ScoredSignal } from "./types";

const fieldOrder: FieldId[] = ["love", "ability", "meaning", "paid"];

const complementaryPairs = [
  ["creating", "clarity", "Creating clarity"],
  ["building", "access", "Building access"],
  ["empathy", "guidance", "Empathetic guidance"],
  ["analysis", "better-decisions", "Analysis for better decisions"],
  ["storytelling", "belonging", "Storytelling for belonging"],
  ["connecting", "community", "Connecting community"],
  ["designing", "beauty", "Designing with beauty"],
  ["teaching", "confidence", "Teaching for confidence"],
  ["organizing", "efficiency", "Organizing for efficiency"],
  ["strategy", "opportunity", "Strategy toward opportunity"],
] as const;

const roleRules = [
  { role: "Builder", themes: ["building", "creating", "execution", "hands-on"], explanation: "There is evidence of turning ideas into tangible things and making them usable." },
  { role: "Guide", themes: ["mentoring", "guidance", "teaching", "empathy"], explanation: "There is evidence of helping others navigate, learn, or gain confidence." },
  { role: "Translator", themes: ["explaining", "synthesis", "clarity", "communicating"], explanation: "There is evidence of making complex ideas clearer for other people." },
  { role: "Connector", themes: ["connecting", "community", "relationship-building", "belonging"], explanation: "There is evidence of bringing people, groups, or ideas into relationship." },
  { role: "Investigator", themes: ["researching", "analysis", "curiosity", "understanding"], explanation: "There is evidence of investigating patterns and turning questions into insight." },
  { role: "Organizer", themes: ["organizing", "operating", "structured", "efficiency"], explanation: "There is evidence of creating order, systems, and reliable execution." },
  { role: "Storyteller", themes: ["storytelling", "expression", "communicating", "creators"], explanation: "There is evidence of shaping meaning through words, narrative, or creative expression." },
  { role: "Strategist", themes: ["strategy", "judgment", "better-decisions", "leading"], explanation: "There is evidence of helping decisions, priorities, and direction become sharper." },
  { role: "Creator", themes: ["creative-thinking", "artistic-performance", "expression", "designing", "beauty"], explanation: "There is evidence of developing original ideas and giving them an expressive or visual form." },
  { role: "Facilitator", themes: ["facilitation", "collaboration", "people-facing", "better-decisions"], explanation: "There is evidence of helping groups participate, find alignment, and move toward shared decisions." },
  { role: "Steward", themes: ["nature-environment", "caring", "positive-change", "advocacy"], explanation: "There is evidence of protecting people, communities, or environments and helping them thrive over time." },
];

function relatedIds(themeId: string) {
  const theme = ontologyById[themeId];
  return new Set([themeId, theme?.parentId, ...(theme?.relatedThemeIds ?? [])].filter(Boolean) as string[]);
}

function signalFor(signals: ScoredSignal[], themeId: string) {
  const target = relatedIds(themeId);
  return signals.find((signal) => {
    const signalRelated = relatedIds(signal.id);
    return [...target].some((id) => signalRelated.has(id));
  });
}

function directSignalFor(signals: ScoredSignal[], themeId: string) {
  return signals.find((signal) => signal.id === themeId || signal.parentId === themeId || ontologyById[signal.id]?.parentId === themeId);
}

function uniqueSignals(signals: ScoredSignal[]) {
  return [...new Map(signals.map((signal) => [signal.id, signal])).values()];
}

function directEvidenceIds(signal: ScoredSignal, minimumConfidence = 0.5) {
  return [...new Set(signal.evidence
    .filter((item) => !item.inference && item.confidence >= minimumConfidence)
    .map((item) => item.reflectionId))];
}

function inferredEvidenceIds(signal: ScoredSignal, minimumConfidence = 0.48) {
  return [...new Set(signal.evidence
    .filter((item) => item.inference && item.confidence >= minimumConfidence)
    .map((item) => item.reflectionId))];
}

function isDerivedParent(signal: ScoredSignal) {
  const theme = ontologyById[signal.id];
  if (!theme || theme.parentId) return false;
  return !signal.evidence.some((item) => item.themeId === signal.id && !item.inference);
}

function evidenceIds(signals: ScoredSignal[]) {
  return [...new Set(signals.flatMap((signal) => signal.evidence.map((item) => item.reflectionId)))].sort();
}

function pattern(title: string, explanation: string, signals: ScoredSignal[], confidence = 0.72): PatternResult {
  return {
    title,
    explanation,
    themeIds: [...new Set(signals.map((signal) => signal.id))],
    evidenceReflectionIds: evidenceIds(signals),
    confidence: Number(confidence.toFixed(3)),
  };
}

function intersection(signals: ScoredSignal[], required: FieldId[], title: string) {
  const matches = signals.filter((signal) => (
    !signal.id.startsWith("keyword:")
    && !isDerivedParent(signal)
    && required.every((fieldId) => signal.fields.includes(fieldId))
    && new Set(signal.evidence.filter((item) => required.includes(item.fieldId)).map((item) => item.reflectionId)).size >= required.length
  ));
  return matches.slice(0, 3).map((signal) => pattern(
    title,
    `${signal.label} appears across ${required.map((fieldId) => fieldsById[fieldId].emphasis.toLowerCase()).join(" and ")} signals.`,
    [signal],
    signal.confidence,
  ));
}

function hasField(signal: ScoredSignal | undefined, fieldId: FieldId) {
  return Boolean(signal?.fields.includes(fieldId));
}

function fieldThemeSignals(signals: ScoredSignal[], fieldId: FieldId) {
  return signals.filter((signal) => signal.fields.includes(fieldId) && !signal.id.startsWith("keyword:"));
}

export function detectPatterns(signals: ScoredSignal[], reflections: FieldReflections): InsightPatterns {
  const recurringThemes = signals
    .filter((signal) => {
      if (signal.id.startsWith("keyword:") || isDerivedParent(signal)) return false;
      const directCount = directEvidenceIds(signal).length;
      const inferredCount = inferredEvidenceIds(signal, 0.42).length;
      return directCount >= 2 || (directCount + inferredCount >= 3 && signal.fields.length >= 2);
    })
    .slice(0, 6)
    .map((signal) => pattern(
      signal.label,
      `Supported by ${signal.reflectionCount} reflections across ${signal.fields.map((fieldId) => fieldsById[fieldId].emphasis.toLowerCase()).join(", ")}.`,
      [signal],
      signal.confidence,
    ));

  const complementaryPatterns = complementaryPairs.flatMap(([left, right, title]) => {
    const leftSignal = signalFor(signals, left);
    const rightSignal = signalFor(signals, right);
    if (!leftSignal || !rightSignal || leftSignal.id === rightSignal.id) return [];
    if (evidenceIds([leftSignal, rightSignal]).length < 3) return [];
    return [pattern(title, `A pattern worth exploring is ${leftSignal.label.toLowerCase()} combined with ${rightSignal.label.toLowerCase()}.`, [leftSignal, rightSignal], (leftSignal.confidence + rightSignal.confidence) / 2)];
  }).slice(0, 5);

  const intersections = {
    passion: intersection(signals, ["love", "ability"], "Passion signal"),
    mission: intersection(signals, ["love", "meaning"], "Mission signal"),
    profession: intersection(signals, ["ability", "paid"], "Profession signal"),
    vocation: intersection(signals, ["meaning", "paid"], "Vocation signal"),
    core: intersection(signals, fieldOrder, "Core convergence"),
  };

  const emergingRoles = roleRules.flatMap((rule) => {
    const supporting = uniqueSignals(rule.themes.map((themeId) => directSignalFor(signals, themeId)).filter((signal): signal is ScoredSignal => Boolean(signal)));
    if (supporting.length < 2) return [];
    const ids = evidenceIds(supporting);
    const directIds = [...new Set(supporting.flatMap((signal) => directEvidenceIds(signal)))];
    const fields = new Set(supporting.flatMap((signal) => signal.fields));
    if (ids.length < 2 || directIds.length < 2 || fields.size < 2) return [];
    const score = supporting.reduce((sum, signal) => sum + signal.score, 0) + supporting.length * 2;
    return [{ role: rule.role, evidenceReflectionIds: ids, explanation: rule.explanation, score }];
  }).sort((a, b) => b.score - a.score || a.role.localeCompare(b.role)).map((role) => ({
    role: role.role,
    evidenceReflectionIds: role.evidenceReflectionIds,
    explanation: role.explanation,
  })).slice(0, 4);

  const tensions: InsightPatterns["tensions"] = [];
  const loveThemes = fieldThemeSignals(signals, "love").slice(0, 5);
  const paidThemes = fieldThemeSignals(signals, "paid").slice(0, 5);
  const meaningThemes = fieldThemeSignals(signals, "meaning").slice(0, 5);
  const loveMissingPaid = loveThemes.find((signal) => !hasField(signal, "paid") && signal.reflectionCount >= 1);
  if (loveMissingPaid && reflections.paid.length >= 2) tensions.push({
    title: "Loved signal not yet connected to livelihood",
    explanation: `One possible tension is that ${loveMissingPaid.label.toLowerCase()} appears in what energizes you, but has little Paid For evidence yet.`,
    evidenceReflectionIds: evidenceIds([loveMissingPaid]),
  });
  const paidMissingLove = paidThemes.find((signal) => !hasField(signal, "love") && signal.reflectionCount >= 1);
  if (paidMissingLove && reflections.love.length >= 2) tensions.push({
    title: "Livelihood signal not yet connected to energy",
    explanation: `${paidMissingLove.label} appears in sustainability signals, but has little evidence in what feels energizing.`,
    evidenceReflectionIds: evidenceIds([paidMissingLove]),
  });
  const meaningMissingAbility = meaningThemes.find((signal) => !hasField(signal, "ability") && reflections.ability.length >= 2);
  if (meaningMissingAbility) tensions.push({
    title: "Impact signal needs more ability evidence",
    explanation: `${meaningMissingAbility.label} appears in needs you care about, but the related strengths are still lightly evidenced.`,
    evidenceReflectionIds: evidenceIds([meaningMissingAbility]),
  });

  const autonomy = signalFor(signals, "freedom");
  const stability = signalFor(signals, "stability");
  if (autonomy && stability) tensions.push({
    title: "Autonomy and stability both matter",
    explanation: "One possible tension is wanting room to self-direct while also wanting reliable structure or security.",
    evidenceReflectionIds: evidenceIds([autonomy, stability]),
  });
  const exploration = signalFor(signals, "exploring");
  const structure = signalFor(signals, "structured");
  if (exploration && structure) tensions.push({
    title: "Exploration with structure",
    explanation: "There is evidence of both curiosity and organized execution; the useful question may be how much structure keeps exploration alive.",
    evidenceReflectionIds: evidenceIds([exploration, structure]),
  });
  const peopleFacing = signalFor(signals, "people-facing");
  const independent = signalFor(signals, "independent");
  if (peopleFacing && independent) tensions.push({
    title: "People-facing and independent modes",
    explanation: "There is evidence of both relational work and quieter self-directed work.",
    evidenceReflectionIds: evidenceIds([peopleFacing, independent]),
  });

  const dimensions = new Set(signals.flatMap((signal) => signal.dimensions));
  const missingSignals: InsightPatterns["missingSignals"] = [];
  const fieldCounts = fieldOrder.map((fieldId) => ({ fieldId, count: reflections[fieldId].length }));
  const lowest = fieldCounts.sort((a, b) => a.count - b.count)[0];
  if (lowest.count < 2) missingSignals.push({
    title: `${fieldsById[lowest.fieldId].panelTitle} needs more signal`,
    explanation: `You have fewer saved reflections around ${fieldsById[lowest.fieldId].emphasis.toLowerCase()}.`,
    suggestedPrompt: lowest.fieldId === "paid" ? "What part of this would another person or organization value enough to pay for?" : fieldsById[lowest.fieldId].prompt,
  });
  if (!dimensions.has("audience")) missingSignals.push({ title: "Audience is still unclear", explanation: "The reflections do not yet strongly name who this work serves.", suggestedPrompt: "Who do you most want this work to help?" });
  if (!dimensions.has("impact")) missingSignals.push({ title: "Impact is still unclear", explanation: "There are not many signals about what becomes better for someone else.", suggestedPrompt: "What becomes easier or better for someone because of this?" });
  if (!dimensions.has("workStyle")) missingSignals.push({ title: "Work style is still unclear", explanation: "The reflections do not yet say much about the conditions where you do your best work.", suggestedPrompt: "What pace, structure, or collaboration style helps you feel most alive?" });

  return {
    recurringThemes,
    complementaryPatterns,
    intersections,
    tensions: tensions.filter((item) => item.evidenceReflectionIds.length > 0).slice(0, 4),
    missingSignals: missingSignals.slice(0, 4),
    emergingRoles,
  };
}
