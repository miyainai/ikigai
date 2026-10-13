import { fieldConfigs } from "./fieldConfig";
import type { FieldId, FieldReflections } from "./types";

export function nextUnexploredField(reflections: FieldReflections, after: FieldId | null = null) {
  const start = after === null ? -1 : fieldConfigs.findIndex((field) => field.id === after);
  for (let offset = 1; offset <= fieldConfigs.length; offset++) {
    const field = fieldConfigs[(start + offset) % fieldConfigs.length];
    if (field.id !== after && reflections[field.id].length === 0) return field;
  }
  return null;
}
