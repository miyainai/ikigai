import type { FieldId, Reflection } from "../ikigai-alpha/types";

export type { FieldId, Reflection };

export type InsightDimension =
  | "activity"
  | "strength"
  | "value"
  | "impact"
  | "audience"
  | "workStyle"
  | "role";

export interface OntologyTheme {
  id: string;
  parentId?: string;
  label: string;
  dimensions: InsightDimension[];
  aliases: string[];
  chineseAliases?: string[];
  relatedThemeIds?: string[];
  directionTemplates?: string[];
  experimentTemplates?: string[];
}

export interface NormalizedText {
  words: string[];
  phrases: string[];
  chineseTokens: string[];
  meaningfulKeywords: string[];
}

export interface SignalEvidence {
  reflectionId: string;
  fieldId: FieldId;
  excerpt: string;
  themeId: string;
  dimension: InsightDimension;
  confidence: number;
  source: "label" | "notes";
  inference?: "transferable-skill" | "semantic-prototype";
}

export interface ScoredSignal {
  id: string;
  label: string;
  parentId?: string;
  dimensions: InsightDimension[];
  score: number;
  reflectionCount: number;
  fields: FieldId[];
  evidence: SignalEvidence[];
  sourceDiversity: number;
  specificity: number;
  confidence: number;
}

export interface PatternResult {
  title: string;
  explanation: string;
  themeIds: string[];
  evidenceReflectionIds: string[];
  confidence: number;
}

export interface InsightPatterns {
  recurringThemes: PatternResult[];
  complementaryPatterns: PatternResult[];
  intersections: {
    passion?: PatternResult[];
    mission?: PatternResult[];
    profession?: PatternResult[];
    vocation?: PatternResult[];
    core?: PatternResult[];
  };
  tensions: Array<{
    title: string;
    explanation: string;
    evidenceReflectionIds: string[];
  }>;
  missingSignals: Array<{
    title: string;
    explanation: string;
    suggestedPrompt: string;
  }>;
  emergingRoles: Array<{
    role: string;
    evidenceReflectionIds: string[];
    explanation: string;
  }>;
}

export interface ComprehensiveIkigaiInsight {
  readiness: {
    state: "still-forming" | "early-signals" | "patterns-emerging" | "strong-convergence";
    reason: string;
  };
  progress: {
    exploredFields: number;
    totalFields: number;
    totalReflections: number;
    recurringThemeCount: number;
  };
  takeaway: {
    title: string;
    explanation: string;
    evidenceReflectionIds: string[];
  };
  nextStep: {
    title: string;
    prompt: string;
    fieldId?: FieldId;
  };
  headline: string;
  statement: string;
  topThemes: Array<{
    id: string;
    label: string;
    dimensions: InsightDimension[];
    fields: FieldId[];
    evidence: SignalEvidence[];
    confidence: number;
  }>;
  recurringThemes: PatternResult[];
  emergingRoles: Array<{
    role: string;
    evidenceReflectionIds: string[];
    explanation: string;
  }>;
  intersections: {
    passion?: PatternResult[];
    mission?: PatternResult[];
    profession?: PatternResult[];
    vocation?: PatternResult[];
    core?: PatternResult[];
  };
  complementaryPatterns: PatternResult[];
  tensions: Array<{
    title: string;
    explanation: string;
    evidenceReflectionIds: string[];
  }>;
  missingSignals: Array<{
    title: string;
    explanation: string;
    suggestedPrompt: string;
  }>;
  directions: Array<{
    title: string;
    explanation: string;
    supportingThemeIds: string[];
    evidenceReflectionIds: string[];
  }>;
  experiment: {
    title: string;
    description: string;
    whatToObserve: string[];
  };
}
