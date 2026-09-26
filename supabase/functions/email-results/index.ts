import { formatResults } from "./format.ts";

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Promise<Response>): void };
const env = (name: string) => Deno.env.get(name) ?? "";
const jsonHeaders = { "Content-Type": "application/json" };

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = env("APP_ORIGINS").split(",").map((v) => v.trim()).filter(Boolean);
  const headers = { ...jsonHeaders, "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "null", Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  const respond = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers });
  if (!allowed.includes(origin)) return respond(403, "Origin not allowed");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return respond(405, "Method not allowed");
  if (!env("RESEND_API_KEY") || !env("RESULTS_EMAIL_FROM") || !env("TURNSTILE_SECRET_KEY")) return respond(503, "Email is not configured");
  try {
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return respond(401, "Session required");
    const base = env("SUPABASE_URL");
    const userHeaders = { apikey: env("SUPABASE_ANON_KEY"), Authorization: authorization };
    const auth = await fetch(`${base}/auth/v1/user`, { headers: userHeaders, signal: AbortSignal.timeout(10000) });
    if (!auth.ok) return respond(401, "Session required");
    const user = await auth.json();
    if (!user.id) return respond(401, "Session required");
    const reader = req.body?.getReader();
    if (!reader) return respond(400, "Invalid request");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) { await reader.cancel(); return respond(413, "Request too large"); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let body;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return respond(400, "Invalid request"); }
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || typeof body.captchaToken !== "string" || body.captchaToken.length > 2048) return respond(400, "Invalid request");
    const challenge = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: jsonHeaders, body: JSON.stringify({ secret: env("TURNSTILE_SECRET_KEY"), response: body.captchaToken }), signal: AbortSignal.timeout(10000),
    });
    const verification = await challenge.json();
    if (!verification.success || verification.action !== "email-results" || verification.hostname !== new URL(origin).hostname) return respond(400, "Verification failed");
    // Fetch only the authenticated visitor's persisted result, never accept mail content from the request.
    const result = await fetch(`${base}/rest/v1/reflection_maps?select=insight_output,revision&limit=1`, { headers: userHeaders, signal: AbortSignal.timeout(10000) });
    if (!result.ok) throw new Error("map_read");
    const rows = await result.json();
    const content = formatResults(rows[0]?.insight_output);
    if (!content) return respond(409, "Save a reflection first");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
    const recipientHash = [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, "0")).join("");
    const reserved = await fetch(`${base}/rest/v1/rpc/reserve_results_email`, {
      method: "POST", headers: { ...jsonHeaders, apikey: env("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ owner_id: user.id, recipient_hash: recipientHash }), signal: AbortSignal.timeout(10000),
    });
    if (!reserved.ok) throw new Error("rate_limit_store");
    const requestId = await reserved.json();
    if (!requestId) return respond(429, "Please wait before sending again");
    const delivery = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { ...jsonHeaders, Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Idempotency-Key": requestId },
      body: JSON.stringify({ from: env("RESULTS_EMAIL_FROM"), to: [email], subject: "Your Locus reflection", text: content }), signal: AbortSignal.timeout(15000),
    });
    if (!delivery.ok) throw new Error("email_provider");
    // Never log email addresses, tokens, reflections, or generated result text.
    console.info(JSON.stringify({ event: "results_email_accepted" }));
    return new Response(JSON.stringify({ accepted: true }), { headers });
  } catch {
    console.error(JSON.stringify({ event: "results_email_failed" }));
    return respond(503, "Could not send; please try later");
  }
});
