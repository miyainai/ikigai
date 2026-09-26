function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, limit = 1200) {
  return typeof value === "string" ? [...value].filter((char) => char.charCodeAt(0) >= 32 || char === "\n" || char === "\t").join("").slice(0, limit) : "";
}

export function formatResults(value: unknown): string | null {
  const insight = object(object(value).comprehensive);
  const takeaway = object(insight.takeaway);
  const next = object(insight.nextStep);
  if (!text(takeaway.title) || !text(takeaway.explanation)) return null;
  const themes = Array.isArray(insight.recurringThemes) ? insight.recurringThemes.slice(0, 4).map((v) => text(object(v).title, 120)).filter(Boolean) : [];
  return ["Your Locus reflection", "", text(takeaway.title, 200), text(takeaway.explanation), "",
    ...(themes.length ? ["What keeps returning", ...themes.map((theme) => `- ${theme}`), ""] : []),
    "A next step", text(next.title, 200), text(next.prompt), "",
    "These are patterns to explore, not a definitive assessment of your purpose.",
    "Private reflection notes are not included. This email does not create an account or restore access on another device.",
    "You requested this one-time email from Locus. No subscription was created.",
  ].join("\n");
}
