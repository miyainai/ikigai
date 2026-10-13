import { wrapText, type Journal } from "./model";

export const PAGE_WIDTH = 595;
export const PAGE_HEIGHT = 842;
const ink = "#edf3f0";
const muted = "#aebfc8";
const accent = "#add8ce";

export function renderJournalPage(ctx: CanvasRenderingContext2D, journal: Journal, page: 1 | 2) {
  const text = (value: string, x: number, y: number, size = 12, color = ink, serif = false) => {
    ctx.fillStyle = color;
    ctx.font = `400 ${size}px ${serif ? '"Newsreader Variable", Georgia' : '"Manrope Variable", Arial'}, sans-serif`;
    ctx.fillText(value, x, y);
  };
  const paragraph = (value: string, x: number, y: number, width: number, size = 12, leading = 19, color = muted, maxLines = 10) => {
    ctx.font = `400 ${size}px "Manrope Variable", Arial, sans-serif`;
    const lines = wrapText(value, width, (v) => ctx.measureText(v).width);
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
      let last = visible[visible.length - 1];
      while (last && ctx.measureText(`${last}...`).width > width) last = Array.from(last).slice(0, -1).join("");
      visible[visible.length - 1] = `${last}...`;
    }
    visible.forEach((line, i) => text(line, x, y + i * leading, size, color));
    return y + visible.length * leading;
  };
  const rule = (y: number, x = 44, width = 507) => {
    ctx.strokeStyle = "#30414a"; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + width, y); ctx.stroke();
  };
  const constellation = (cx: number, cy: number, radius: number) => {
    journal.fields.forEach((field, i) => {
      const angle = [-Math.PI / 2, Math.PI, 0, Math.PI / 2][i];
      const x = cx + Math.cos(angle) * radius * 0.53;
      const y = cy + Math.sin(angle) * radius * 0.53;
      ctx.strokeStyle = field.color; ctx.globalAlpha = 0.4; ctx.lineWidth = 0.65;
      ctx.beginPath(); ctx.ellipse(x, y, radius * 0.65, radius * 0.58, (i - 1) * 0.18, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = field.color;
      ctx.beginPath(); ctx.arc(x + Math.cos(angle) * radius * 0.65, y + Math.sin(angle) * radius * 0.58, 2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.fill();
  };

  ctx.fillStyle = "#080f18"; ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  const wash = ctx.createLinearGradient(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  wash.addColorStop(0, "#14232c"); wash.addColorStop(0.55, "#0b111d"); wash.addColorStop(1, "#141323");
  ctx.fillStyle = wash; ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  for (let i = 0; i < 80; i++) {
    const x = (i * 137.508 + 17) % PAGE_WIDTH;
    const y = (i * i * 43.1 + 29) % PAGE_HEIGHT;
    ctx.fillStyle = i % 3 ? "#ffffff16" : "#a9d6cd35";
    ctx.beginPath(); ctx.arc(x, y, i % 5 ? 0.45 : 0.8, 0, Math.PI * 2); ctx.fill();
  }
  text("LOCUS", 44, 43, 12, accent);
  text("A personal field journal", 328, 43, 10, muted);
  rule(60);

  if (page === 1) {
    text("A little closer", 44, 112, 37, ink, true);
    text("to what matters.", 44, 153, 37, ink, true);
    constellation(471, 122, 46);
    paragraph("You do not need a perfect answer to make room for a better question.", 44, 192, 480, 13, 21, accent, 2);
    paragraph("This exercise is a pause, not a verdict on who you are. Looking across what you love, what comes naturally, what you care about, and what can sustain you can make quieter patterns easier to notice. Keep what feels true. Question what does not. Leave room to change.", 44, 244, 496, 11.5, 18, muted, 5);
    rule(338);
    text("IN YOUR OWN WORDS", 44, 362, 10, accent);
    text(`${journal.total} reflections / ${journal.date}`, 282, 362, 9, muted);
    journal.fields.forEach((field, index) => {
      const x = 44 + (index % 2) * 267;
      const y = 386 + Math.floor(index / 2) * 190;
      text(field.title, x, y, 16, field.color, true);
      rule(y + 13, x, 240);
      let cursor = y + 34;
      if (!field.labels.length) paragraph("Still open. An unanswered field is an invitation, not a failure.", x, cursor, 231, 10.5, 16, muted, 3);
      for (const label of field.labels) {
        ctx.fillStyle = field.color; ctx.beginPath(); ctx.arc(x + 2, cursor - 3, 1.5, 0, Math.PI * 2); ctx.fill();
        // Each label has a bounded two-line slot; no user text can spill into another field.
        cursor = paragraph(label, x + 12, cursor, 226, 10, 11, ink, 2) + 1;
      }
      if (field.omitted) text(`+ ${field.omitted} earlier reflections remain in your map`, x, y + 175, 8, muted);
    });
    text("A snapshot of your recent short reflections. Private notes are not included.", 44, 766, 9, muted);
  } else {
    text("Let the day", 44, 112, 37, ink, true);
    text("add something.", 44, 153, 37, ink, true);
    text("Nothing here needs to become a label you live inside.", 44, 186, 12, accent);
    rule(209);
    text("A PATTERN TO CONSIDER", 44, 236, 10, accent);
    const end = paragraph(journal.takeaway.title, 44, 267, 495, 19, 25, ink, 2);
    paragraph(journal.takeaway.explanation, 44, end + 9, 495, 11.5, 18, muted, 4);
    text("WHAT KEEPS RETURNING", 44, 408, 10, accent);
    paragraph(journal.themes.length ? journal.themes.join("  /  ") : "No recurring theme yet. Your own words are still worth keeping.", 44, 435, 490, 13, 20, ink, 2);
    rule(474);
    text("ONE SMALL EXPERIMENT", 44, 501, 10, accent);
    paragraph(journal.next, 44, 528, 495, 12, 19, ink, 4);
    text("NOTICE, WITHOUT RUSHING TO EXPLAIN", 44, 626, 10, accent);
    const prompts = [
      "When today did you feel absorbed, useful, or quietly yourself?",
      "What mattered even when nobody was watching or rewarding you?",
      "What is one small thing you could make more room for tomorrow?",
    ];
    prompts.forEach((prompt, i) => paragraph(prompt, 44, 651 + i * 29, 495, 10.5, 15, ink, 1));
    paragraph("These are suggestions from local pattern matching, not a diagnosis or a definitive purpose. Your interpretation matters more than the pattern.", 44, 747, 495, 9, 13, muted, 2);
  }
  rule(788);
  text("find-your-locus.vercel.app", 44, 809, 9, muted);
  text(page === 1 ? "Your words / 1" : "Your next questions / 2", 421, 809, 9, muted);
}
