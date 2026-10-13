import { afterEach, describe, expect, it, vi } from "vitest";
import { validateEvent } from "../../supabase/functions/activity-event/schema";
import { trackAction } from "./activity";
const payload = { eventId: "6b26cd72-c9b4-4a83-a27c-33ce6aa9a7bc", sessionId: "0bdb8be8-c201-440b-af81-d937d7c8ef58", action: "reflection_added", field: "love" };
afterEach(() => { vi.unstubAllGlobals(); });
describe("content-free activity", () => {
  it("rejects content, identifiers, unknown actions and arbitrary fields", () => {
    expect(validateEvent(payload)).toEqual(payload);
    for (const extra of [{ label: "private" }, { notes: "private" }, { output: {} }, { email: "x@y.z" }, { user_id: "old-auth" }, { url: "private" }]) expect(validateEvent({ ...payload, ...extra })).toBeNull();
    expect(validateEvent({ ...payload, action: "private words" })).toBeNull();
    expect(validateEvent({ ...payload, field: "private words" })).toBeNull();
    expect(validateEvent({ ...payload, action: "pdf_generated" })).toBeNull();
    expect(validateEvent({ ...payload, sessionId: "someone@example.com" })).toBeNull();
  });
  it("automatically sends only allowlisted action data without storing a preference", () => {
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) };
    vi.stubGlobal("localStorage", storage); vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("location", { hostname: "find-your-locus.vercel.app" }); vi.stubGlobal("navigator", {});
    const send = vi.fn().mockResolvedValue({}); vi.stubGlobal("fetch", send);
    trackAction("reflection_added", "love");
    expect(send).toHaveBeenCalledOnce();
    const request = send.mock.calls[0][1];
    expect(Object.keys(JSON.parse(request.body)).sort()).toEqual(["action", "eventId", "field", "sessionId"]);
    expect(request.credentials).toBe("omit"); expect(request.referrerPolicy).toBe("no-referrer");
    expect(storage.getItem("locus-usage-opt-in-v1")).toBeNull();
    trackAction("exercise_started"); trackAction("exercise_started");
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("honors a previously saved explicit opt-out", () => {
    vi.stubGlobal("localStorage", { getItem: () => "no" });
    vi.stubGlobal("location", { hostname: "find-your-locus.vercel.app" }); vi.stubGlobal("navigator", {});
    const send = vi.fn(); vi.stubGlobal("fetch", send);
    trackAction("pdf_generated"); expect(send).not.toHaveBeenCalled();
  });
  it("does not collect in development or when a privacy signal is enabled", () => {
    vi.stubGlobal("localStorage", { getItem: () => "yes" });
    vi.stubGlobal("location", { hostname: "localhost" }); vi.stubGlobal("navigator", {});
    const send = vi.fn(); vi.stubGlobal("fetch", send);
    trackAction("pdf_generated"); expect(send).not.toHaveBeenCalled();
    vi.stubGlobal("location", { hostname: "find-your-locus.vercel.app" }); vi.stubGlobal("navigator", { globalPrivacyControl: true });
    trackAction("pdf_generated"); expect(send).not.toHaveBeenCalled();
    vi.stubGlobal("navigator", { doNotTrack: "1" });
    trackAction("pdf_generated"); expect(send).not.toHaveBeenCalled();
  });
  it("does not interrupt the exercise when browser storage is unavailable", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("Storage blocked"); } });
    vi.stubGlobal("location", { hostname: "find-your-locus.vercel.app" }); vi.stubGlobal("navigator", {});
    const send = vi.fn(); vi.stubGlobal("fetch", send);
    expect(() => trackAction("pdf_generated")).not.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
