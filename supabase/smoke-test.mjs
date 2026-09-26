import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

// Opt-in live test: creates two disposable anonymous identities, then clears their maps.
const url = 'https://psaddlwwgwqpeuyyqzjt.supabase.co';
const key = 'sb_publishable_BZexUL8uACRt8Rg23Pdrww_c6lSzKjF';
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const a = client(), b = client(), guest = client();
const empty = { love: [], ability: [], meaning: [], paid: [] };
const save = (c, revision, reflections, output = null) => c.rpc('save_reflection_map', {
  expected_revision: revision, new_reflections: reflections, new_output: output, new_engine_version: 'smoke-test',
});
const authA = await a.auth.signInAnonymously();
assert.ifError(authA.error);
const authB = await b.auth.signInAnonymously();
assert.ifError(authB.error);
try {
  const reflections = { ...empty, love: [{ id: 'smoke', fieldId: 'love', label: 'Disposable test', notes: 'Test only', createdAt: Date.now(), positionSeed: 0.5 }] };
  const saved = await save(a, 0, reflections, { status: 'Test only' });
  assert.ifError(saved.error); assert.equal(saved.data, 1);
  const own = await a.from('reflection_maps').select('*');
  assert.ifError(own.error); assert.equal(own.data.length, 1);
  assert.equal(own.data[0].insight_output.status, 'Test only');
  const other = await b.from('reflection_maps').select('*').eq('user_id', authA.data.user.id);
  assert.ifError(other.error); assert.equal(other.data.length, 0);
  const attack = await b.from('reflection_maps').update({ insight_output: {} }).eq('user_id', authA.data.user.id);
  assert.ok(attack.error);
  assert.ok((await guest.from('reflection_maps').select('*')).error);
  const conflict = await save(a, 0, empty); assert.ifError(conflict.error); assert.equal(conflict.data, null);
  const invalid = await save(a, 1, { ...empty, love: [{ ...reflections.love[0], label: 'x'.repeat(41) }] });
  assert.ok(invalid.error);
  const cleared = await save(a, 1, empty); assert.ifError(cleared.error); assert.equal(cleared.data, 2);
  const row = await a.from('reflection_maps').select('*').single();
  assert.ifError(row.error); assert.deepEqual(row.data.reflections, empty); assert.equal(row.data.insight_output, null);
  globalThis.console.log('PASS: input/output persistence, own-row isolation, denied cross-user writes, guest denial, revision conflicts, validation, and clear.');
} finally {
  for (const c of [a, b]) {
    const { data } = await c.from('reflection_maps').select('revision').maybeSingle();
    if (data) await save(c, data.revision, empty);
    await c.auth.signOut();
  }
}
