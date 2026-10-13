import { validateEvent } from "./schema.ts";

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
const origins = new Set(["https://find-your-locus.vercel.app", "https://temporary-nimble-khaki-f5tsnbn.vercel.app"]);

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  const headers = { "Access-Control-Allow-Origin": origin, "Vary": "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Cache-Control": "no-store" };
  const respond = (status: number) => new Response(null, { status, headers });
  if (!origins.has(origin)) return new Response(null, { status: 403 });
  if (request.method === "OPTIONS") return respond(204);
  if (request.method !== "POST") return respond(405);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return respond(415);
  // Read at most 512 bytes, including when a caller omits Content-Length.
  if (Number(request.headers.get("content-length")) > 512) return respond(413);
  try {
    const reader = request.body?.getReader();
    if (!reader) return respond(400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 512) { await reader.cancel(); return respond(413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let body: unknown;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return respond(400); }
    const event = validateEvent(body);
    if (!event) return respond(400);
    const base = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!base || !key) return respond(503);
    const result = await fetch(`${base}/rest/v1/rpc/record_activity`, {
      method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_event_id: event.eventId, p_session_id: event.sessionId, p_action: event.action, p_field: event.field ?? null }),
      signal: AbortSignal.timeout(5000),
    });
    if (!result.ok) return respond(503);
    return respond(await result.json() === true ? 204 : 429);
  } catch {
    // Never log request bodies, IP addresses, credentials, or reflection content.
    return respond(503);
  }
});
