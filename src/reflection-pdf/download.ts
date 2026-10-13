import { jsPDF } from "jspdf";
import { createJournal } from "./model";
import { PAGE_HEIGHT, PAGE_WIDTH, renderJournalPage } from "./render";
import type { FieldReflections, LocalIkigaiInsight } from "../ikigai-alpha/types";

export async function downloadReflectionPdf(reflections: FieldReflections, insight: LocalIkigaiInsight) {
  await Promise.all([
    document.fonts.load('400 12px "Manrope Variable"'),
    document.fonts.load('400 37px "Newsreader Variable"'),
  ]);
  const journal = createJournal(reflections, insight);
  const pdf = new jsPDF({ unit: "pt", format: [PAGE_WIDTH, PAGE_HEIGHT], compress: true });
  pdf.setProperties({ title: "Your Locus reflection", subject: "A personal field journal", author: "Locus" });
  // Browser text rendering preserves non-Latin labels and uses the app's local fonts.
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH * 2; canvas.height = PAGE_HEIGHT * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PDF rendering unavailable");
  ctx.scale(2, 2);
  for (const page of [1, 2] as const) {
    renderJournalPage(ctx, journal, page);
    if (page === 2) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  }
  await pdf.save(journal.filename, { returnPromise: true });
  canvas.width = 0; canvas.height = 0;
}
