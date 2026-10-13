export const actions = ["exercise_started", "field_opened", "reflection_added", "reflection_edited", "reflection_deleted", "field_cleared", "map_cleared", "results_viewed", "pdf_generated"] as const;
export type Action = typeof actions[number];
export type ActivityField = "love" | "ability" | "meaning" | "paid";
export interface ActivityEvent { eventId: string; sessionId: string; action: Action; field?: ActivityField }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fieldActions: readonly string[] = ["field_opened", "reflection_added", "reflection_edited", "reflection_deleted", "field_cleared"];
export function validateEvent(value: unknown): ActivityEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !["eventId", "sessionId", "action", "field"].includes(key))) return null;
  if (typeof row.eventId !== "string" || !uuid.test(row.eventId) || typeof row.sessionId !== "string" || !uuid.test(row.sessionId)) return null;
  if (typeof row.action !== "string" || !actions.includes(row.action as Action)) return null;
  if (fieldActions.includes(row.action)) {
    if (!["love", "ability", "meaning", "paid"].includes(row.field as string)) return null;
  } else if (row.field !== undefined) return null;
  return { eventId: row.eventId, sessionId: row.sessionId, action: row.action as Action, ...(row.field ? { field: row.field as ActivityField } : {}) };
}
