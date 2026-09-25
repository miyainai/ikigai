export interface CapabilityInference {
  themeId: string;
  confidence: number;
}

export interface CapabilityRule {
  id: string;
  cues: string[];
  inferred: CapabilityInference[];
}

// Concrete activities can provide evidence for transferable capabilities, but
// at lower confidence than an explicit statement such as "I am analytical."
export const capabilityRules: CapabilityRule[] = [
  {
    id: "quantitative-practice",
    cues: ["math", "mathematics", "numbers", "calculation", "calculate", "statistics", "probability", "accounting", "spreadsheet", "financial modeling", "poker"],
    inferred: [
      { themeId: "quantitative-reasoning", confidence: 0.68 },
      { themeId: "pattern-recognition", confidence: 0.42 },
    ],
  },
  {
    id: "strategic-games",
    cues: ["poker", "chess", "strategy game", "game theory", "negotiation", "competitive debate"],
    inferred: [
      { themeId: "strategy", confidence: 0.58 },
      { themeId: "pattern-recognition", confidence: 0.54 },
    ],
  },
  {
    id: "artistic-practice",
    cues: ["piano", "music", "compose", "composition", "sing", "singing", "guitar", "violin", "art", "drawing", "painting", "illustration", "photography", "dance", "ceramics"],
    inferred: [
      { themeId: "creative-thinking", confidence: 0.7 },
      { themeId: "expression", confidence: 0.55 },
    ],
  },
  {
    id: "long-practice",
    cues: ["piano", "guitar", "violin", "dance", "ballet", "marathon", "athletics", "martial arts", "chess", "woodworking", "ceramics"],
    inferred: [{ themeId: "disciplined-practice", confidence: 0.52 }],
  },
  {
    id: "technical-systems",
    cues: ["code", "coding", "programming", "software", "engineering", "debugging", "automation", "architecture", "systems engineering"],
    inferred: [
      { themeId: "systems-thinking", confidence: 0.68 },
      { themeId: "problem-solving", confidence: 0.5 },
    ],
  },
  {
    id: "spatial-practice",
    cues: ["architecture", "3d modeling", "interior design", "industrial design", "sculpture", "woodworking", "construction", "spatial"],
    inferred: [
      { themeId: "spatial-thinking", confidence: 0.66 },
      { themeId: "designing", confidence: 0.44 },
    ],
  },
  {
    id: "verbal-practice",
    cues: ["debate", "public speaking", "presentation", "writing", "copywriting", "journalism", "podcast", "language learning", "translation"],
    inferred: [{ themeId: "communicating", confidence: 0.62 }],
  },
  {
    id: "relational-practice",
    cues: ["counseling", "therapy", "interviewing", "recruiting", "mediation", "customer research", "user research", "coaching"],
    inferred: [
      { themeId: "social-perception", confidence: 0.62 },
      { themeId: "empathy", confidence: 0.42 },
    ],
  },
  {
    id: "hands-on-craft",
    cues: ["woodworking", "furniture", "sewing", "knitting", "ceramics", "repair", "restoration", "cooking", "baking", "gardening"],
    inferred: [
      { themeId: "craftsmanship", confidence: 0.64 },
      { themeId: "hands-on", confidence: 0.48 },
    ],
  },
  {
    id: "facilitative-practice",
    cues: ["facilitation", "facilitating", "workshop", "mediation", "moderating", "consensus", "group discussion"],
    inferred: [
      { themeId: "facilitation", confidence: 0.72 },
      { themeId: "collaboration", confidence: 0.4 },
    ],
  },
];
