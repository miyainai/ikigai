import { describe, expect, it } from "vitest";
import { validEmail } from "./emailValidation";
import { formatResults } from "../../supabase/functions/email-results/format";

describe("optional results email", () => {
  it("validates recipient syntax and prevents newline/header injection", () => {
    expect(validEmail("person+map@example.com")).toBe(true);
    for (const email of ["no-at", "a@b", "a@b.com\nBcc:other@b.com", "<a@b.com>", "x".repeat(255) + "@b.com"]) expect(validEmail(email)).toBe(false);
  });
  it("does not email incomplete output", () => {
    for (const input of [null, {}, [], { comprehensive: { takeaway: {} } }]) expect(formatResults(input)).toBeNull();
  });
  it("sends only the selected takeaway fields, never notes or evidence", () => {
    const output = formatResults({ comprehensive: {
      takeaway: { title: "A theme", explanation: "Worth exploring", evidenceReflectionIds: ["private-id"] },
      nextStep: { title: "Try this", prompt: "A next question" },
      recurringThemes: [{ title: "Connecting", explanation: "secret evidence" }],
      notes: "private notes", statement: "unused statement",
    } });
    expect(output).toContain("A theme"); expect(output).toContain("Connecting");
    for (const hidden of ["private-id", "secret evidence", "private notes", "unused statement"]) expect(output).not.toContain(hidden);
    expect(output).toContain("does not create an account");
  });
  it("caps untrusted stored content", () => {
    const output = formatResults({ comprehensive: { takeaway: { title: "x".repeat(10000), explanation: "y".repeat(10000) } } });
    expect(output!.length).toBeLessThan(2500);
  });
});
