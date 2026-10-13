import { validateEvent, type Action, type ActivityField } from "../../supabase/functions/activity-event/schema";

const legacyPreferenceKey = "locus-usage-opt-in-v1";
const sessionKey = "locus-usage-session-v1";
const endpoint = "https://psaddlwwgwqpeuyyqzjt.supabase.co/functions/v1/activity-event";
const hosts = ["find-your-locus.vercel.app", "temporary-nimble-khaki-f5tsnbn.vercel.app"];
function analyticsEnabled() {
  // Preserve an explicit opt-out from the earlier consent control.
  try { return localStorage.getItem(legacyPreferenceKey) !== "no"; } catch { return false; }
}

export function trackAction(action: Action, field?: ActivityField) {
  // No retry queue, cookies, auth token, referrer, URL, free text, or persistent user ID.
  if (!analyticsEnabled() || !hosts.includes(location.hostname) || navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
  try {
    const now = Date.now();
    const saved = JSON.parse(sessionStorage.getItem(sessionKey) ?? "null");
    const session = saved && now - saved.last < 30 * 60_000 && now - saved.start < 24 * 60 * 60_000
      ? { ...saved, last: now } : { id: crypto.randomUUID(), start: now, last: now };
    if (action === "exercise_started" && session.started) return;
    if (action === "exercise_started") session.started = true;
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
    const payload = validateEvent({ eventId: crypto.randomUUID(), sessionId: session.id, action, ...(field ? { field } : {}) });
    if (!payload) return;
    void fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(5000),
    }).catch(() => { /* Analytics never blocks reflection or PDF generation. */ });
  } catch { /* Disabled when session storage or networking is unavailable. */ }
}
