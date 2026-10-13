/* global fetch, AbortSignal, crypto, console */
import assert from 'node:assert/strict';

// Fixed test-session ID allows an administrator to remove only these test events.
const sessionId = '741fb9b9-c587-470a-b9e2-4820b2493e94';
const endpoint = 'https://psaddlwwgwqpeuyyqzjt.supabase.co/functions/v1/activity-event';
const headers = { 'Content-Type': 'application/json', Origin: 'https://find-your-locus.vercel.app' };
const send = (body, extra = {}) => fetch(endpoint, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
const event = { sessionId, eventId: crypto.randomUUID(), action: 'reflection_added', field: 'love' };
assert.equal((await send(event)).status, 204);
assert.equal((await send(event)).status, 204); // Idempotent replay.
for (const extra of [{ label: 'REJECT_TEST' }, { notes: 'REJECT_TEST' }, { output: {} }, { field: 'REJECT_TEST' }, { action: 'REJECT_TEST' }]) {
  assert.equal((await send({ ...event, eventId: crypto.randomUUID(), ...extra })).status, 400);
}
assert.equal((await send({ ...event, label: 'x'.repeat(600) })).status, 413);
assert.equal((await send(event, { Origin: 'https://untrusted.example' })).status, 403);
for (const table of ['activity_events', 'activity_daily', 'reflection_maps']) {
  const response = await fetch(`https://psaddlwwgwqpeuyyqzjt.supabase.co/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: 'sb_publishable_BZexUL8uACRt8Rg23Pdrww_c6lSzKjF' }, signal: AbortSignal.timeout(15000),
  });
  assert.ok([401, 403].includes(response.status));
}
console.log('PASS: fixed-schema intake, replay acceptance, content rejection, body cap, origin check, and denied public event reads. Test session:', sessionId);
