export interface ThemeDefinition {
  label: string;
  terms: string[];
}

export const themeTaxonomy: Record<string, ThemeDefinition> = {
  creating: {
    label: "Creating",
    terms: ["build", "make", "create", "craft", "produce", "invent", "bring to life", "make tangible"],
  },
  helping: {
    label: "Helping",
    terms: ["help", "support", "guide", "mentor", "care", "serve", "encourage", "show up"],
  },
  understanding: {
    label: "Understanding",
    terms: ["understand", "analyze", "research", "learn", "insight", "solve", "pattern", "make sense"],
  },
  communicating: {
    label: "Communicating",
    terms: ["communicate", "write", "speak", "explain", "story", "present", "share ideas", "tell stories"],
  },
  connecting: {
    label: "Connecting",
    terms: ["connect", "community", "relationship", "collaborate", "belong", "network", "bring together"],
  },
  leading: {
    label: "Leading",
    terms: ["lead", "direct", "decide", "inspire", "strategy", "vision", "take charge"],
  },
  exploring: {
    label: "Exploring",
    terms: ["explore", "discover", "curious", "experiment", "travel", "investigate", "try new"],
  },
  organizing: {
    label: "Organizing",
    terms: ["organize", "plan", "structure", "coordinate", "system", "process", "bring order"],
  },
  teaching: {
    label: "Teaching",
    terms: ["teach", "coach", "instruct", "educate", "explain", "mentor", "share knowledge"],
  },
  designing: {
    label: "Designing",
    terms: ["design", "prototype", "visual", "interface", "experience", "shape", "user experience"],
  },
};
