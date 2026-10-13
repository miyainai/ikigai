import type { FieldReflections, LocalIkigaiInsight } from "../ikigai-alpha/types";

export const journalFields = [
  { id: "love", title: "What you love", color: "#c3a5f9" },
  { id: "ability", title: "What you're good at", color: "#96bff0" },
  { id: "meaning", title: "What the world needs", color: "#95d8c2" },
  { id: "paid", title: "What can sustain you", color: "#efbd97" },
] as const;

export function createJournal(reflections: FieldReflections, insight: LocalIkigaiInsight, date = new Date()) {
  const fields = journalFields.map((field) => {
    const items = [...reflections[field.id]].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    return { ...field, labels: items.slice(-6).map((item) => item.label), omitted: Math.max(0, items.length - 6) };
  });
  return {
    date: new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(date),
    filename: `locus-reflection-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}.pdf`,
    total: Object.values(reflections).reduce((sum, items) => sum + items.length, 0),
    fields,
    status: insight.status,
    takeaway: { title: insight.comprehensive.takeaway.title, explanation: insight.comprehensive.takeaway.explanation },
    themes: insight.comprehensive.recurringThemes.slice(0, 3).map((theme) => theme.title),
    next: insight.comprehensive.nextStep.prompt,
  };
}

export type Journal = ReturnType<typeof createJournal>;

// Break long unspaced labels too, including CJK and emoji, without interpreting HTML.
export function wrapText(text: string, width: number, measure: (value: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ""; }
      for (const char of Array.from(word)) {
        if (line && measure(line + char) > width) { lines.push(line); line = ""; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}
