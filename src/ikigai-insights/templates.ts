import { fieldsById } from "../ikigai-alpha/fieldConfig";
import type { ScoredSignal } from "./types";

export function readinessCopy(populatedFields: number, totalReflections: number, multiFieldThemes: number) {
  if (totalReflections <= 1) return { state: "still-forming" as const, reason: "One reflection is a starting point. Add another real example so Locus has something to compare." };
  if (populatedFields <= 1 || totalReflections < 4) return { state: "early-signals" as const, reason: "A few signals are visible, but they still sit in one part of your map." };
  if (populatedFields === 4 && totalReflections >= 8 && multiFieldThemes >= 2) return { state: "strong-convergence" as const, reason: "All four fields are represented, and multiple themes recur across your map." };
  if (populatedFields === 4) return { state: "patterns-emerging" as const, reason: "All four fields are represented. The next useful clue is a theme that repeats across them." };
  return { state: "patterns-emerging" as const, reason: "Your map now spans several fields. Some signals may connect as you add concrete examples." };
}

export function readinessLabel(state: ReturnType<typeof readinessCopy>["state"]) {
  return {
    "still-forming": "Still forming",
    "early-signals": "Early signals",
    "patterns-emerging": "Patterns emerging",
    "strong-convergence": "Strong convergence",
  }[state];
}

export function buildStatement(topSignals: ScoredSignal[], role?: string) {
  if (!topSignals.length) return "Your reflections are still forming. A few more concrete signals will make the local pattern clearer.";
  const activity = topSignals.find((signal) => signal.dimensions.includes("activity"));
  const strength = topSignals.find((signal) => signal.dimensions.includes("strength"));
  const impact = topSignals.find((signal) => signal.dimensions.includes("impact"));
  const audience = topSignals.find((signal) => signal.dimensions.includes("audience"));
  const value = topSignals.find((signal) => signal.dimensions.includes("value"));
  const workStyle = topSignals.find((signal) => signal.dimensions.includes("workStyle"));

  const pieces = [
    role ? `a ${role.toLowerCase()} pattern` : undefined,
    activity ? `using ${activity.label.toLowerCase()}` : strength ? `using ${strength.label.toLowerCase()}` : undefined,
    impact ? `to create ${impact.label.toLowerCase()}` : undefined,
    audience ? `for ${audience.label.toLowerCase()}` : undefined,
    value ? `while valuing ${value.label.toLowerCase()}` : workStyle ? `in ${workStyle.label.toLowerCase()} conditions` : undefined,
  ].filter(Boolean);

  if (pieces.length >= 2) return `Your reflections currently suggest ${pieces.join(" ")}. Treat this as a direction to test, not a final answer.`;
  return `Your reflections currently point most strongly toward ${topSignals.slice(0, 2).map((signal) => signal.label.toLowerCase()).join(" and ")}. More evidence will make the shape sharper.`;
}

export function directionFromSignal(signal: ScoredSignal) {
  const fieldText = signal.fields.map((fieldId) => fieldsById[fieldId].emphasis.toLowerCase()).join(" and ");
  return {
    title: `Explore ${signal.label.toLowerCase()} across fields`,
    explanation: `A pattern worth exploring is how ${signal.label.toLowerCase()} connects ${fieldText}.`,
    supportingThemeIds: [signal.id],
    evidenceReflectionIds: [...new Set(signal.evidence.map((item) => item.reflectionId))].sort(),
  };
}

export function experimentFromSignal(signal?: ScoredSignal) {
  if (!signal) {
    return {
      title: "Add one concrete signal",
      description: "Add one specific reflection to the field that currently feels least clear.",
      whatToObserve: ["Whether it feels energizing", "Whether someone else benefits", "Whether it could be repeated"],
    };
  }
  return {
    title: `Run a small ${signal.label.toLowerCase()} test`,
    description: `For the next seven days, try one small experiment centered on ${signal.label.toLowerCase()}. Keep it small enough to finish without needing a new system.`,
    whatToObserve: ["What part gave you energy", "What people noticed or valued", "Whether the work felt sustainable afterwards"],
  };
}
