export interface SemanticThemePrototype {
  themeId: string;
  examples: string[];
}

export const semanticConceptAliases: Record<string, string[]> = {
  clarity: ["clear", "clarify", "simple", "simplify", "understandable", "coherent", "less confusing"],
  complexity: ["messy", "complex", "complicated", "confusing", "scattered", "fragmented", "many inputs"],
  construct: ["build", "make", "create", "prototype", "ship", "turn ideas into reality"],
  investigate: ["research", "study", "investigate", "look deeply", "find evidence", "ask why"],
  patterns: ["pattern", "trend", "signal", "connection", "recurring", "common thread"],
  combine: ["combine", "connect ideas", "pull together", "synthesize", "integrate", "distill"],
  explain: ["explain", "translate", "break down", "teach clearly", "make sense to others"],
  support: ["help", "support", "assist", "guide", "make things easier for"],
  understandPeople: ["listen", "understand people", "notice feelings", "read the room", "see another perspective"],
  coordinate: ["organize", "coordinate", "plan", "structure", "keep on track", "create order"],
  decide: ["decide", "choose", "prioritize", "tradeoff", "set direction", "make a judgment"],
  imagine: ["imagine", "invent", "original idea", "creative possibility", "new approach"],
  calculate: ["calculate", "numbers", "quantitative", "probability", "measure", "estimate"],
  connectPeople: ["bring people together", "introduce people", "build relationships", "create belonging"],
  developPeople: ["mentor", "coach", "encourage growth", "help someone improve", "build confidence"],
};

export const semanticThemePrototypes: SemanticThemePrototype[] = [
  {
    themeId: "building",
    examples: [
      "turn an idea into something tangible that people can use",
      "make a working version and improve it through practice",
      "bring a useful product or tool from concept into reality",
    ],
  },
  {
    themeId: "designing",
    examples: [
      "shape how something looks feels and works for the person using it",
      "make an experience intuitive thoughtful and visually coherent",
      "organize an interface so people can use it without confusion",
    ],
  },
  {
    themeId: "synthesis",
    examples: [
      "turn scattered information into a coherent picture",
      "connect ideas from different sources and find the common thread",
      "pull together many inputs and distill what matters",
    ],
  },
  {
    themeId: "explaining",
    examples: [
      "make a difficult subject easy for someone else to understand",
      "translate technical language into a clear useful explanation",
      "break down a complicated idea without losing its meaning",
    ],
  },
  {
    themeId: "researching",
    examples: [
      "investigate a question deeply and look for reliable evidence",
      "keep asking why until the underlying situation makes sense",
      "study a subject carefully before reaching a conclusion",
    ],
  },
  {
    themeId: "analysis",
    examples: [
      "compare evidence and use it to reach a sound conclusion",
      "work through complicated information in a structured way",
      "evaluate alternatives and understand what is driving the result",
    ],
  },
  {
    themeId: "pattern-recognition",
    examples: [
      "notice recurring signals and trends that other people miss",
      "find the common pattern across apparently separate events",
      "see how several clues connect into a larger picture",
    ],
  },
  {
    themeId: "quantitative-reasoning",
    examples: [
      "use numbers probability and measurement to reason about a problem",
      "calculate outcomes and compare numerical tradeoffs",
      "feel comfortable finding meaning in data and estimates",
    ],
  },
  {
    themeId: "problem-solving",
    examples: [
      "find a practical way through an obstacle",
      "diagnose what is wrong and work toward a useful solution",
      "untangle a difficult situation and make it work better",
    ],
  },
  {
    themeId: "organizing",
    examples: [
      "create order from many moving pieces",
      "build a plan that keeps people and tasks on track",
      "structure work so it can happen reliably",
    ],
  },
  {
    themeId: "strategy",
    examples: [
      "set direction by choosing priorities and making tradeoffs",
      "look ahead and decide where limited effort will matter most",
      "connect a long term goal to a practical sequence of choices",
    ],
  },
  {
    themeId: "teaching",
    examples: [
      "help someone learn by making the lesson understandable",
      "share knowledge in a way that helps another person improve",
      "show people how to do something and build their confidence",
    ],
  },
  {
    themeId: "mentoring",
    examples: [
      "support another person's growth through questions and guidance",
      "coach someone as they make decisions and develop confidence",
      "help a less experienced person find their own direction",
    ],
  },
  {
    themeId: "connecting",
    examples: [
      "bring people together who would benefit from knowing one another",
      "build relationships and help a group feel connected",
      "create belonging by bridging people and communities",
    ],
  },
  {
    themeId: "empathy",
    examples: [
      "listen closely and understand what another person may be feeling",
      "notice another perspective before deciding how to respond",
      "make people feel heard rather than immediately solving the problem",
    ],
  },
  {
    themeId: "guidance",
    examples: [
      "help someone feel less lost and find a useful direction",
      "support people as they navigate a difficult choice",
      "offer a path forward without pretending to have every answer",
    ],
  },
  {
    themeId: "creative-thinking",
    examples: [
      "imagine original possibilities and unusual approaches",
      "generate new ideas when the obvious answer is not enough",
      "combine familiar things into a fresh concept",
    ],
  },
  {
    themeId: "leading",
    examples: [
      "take responsibility for direction and help others move together",
      "make decisions and create momentum when the path is uncertain",
      "align a group around a shared outcome",
    ],
  },
];
