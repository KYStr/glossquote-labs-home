// 可控承諾驗證取消、晚到資料、單一工作列與舊結果失效。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../public/js/session.mjs';
import { LIMITS, renderPixels } from '../public/js/core/images.mjs';
import { file, png, frame, deferred, tick } from './helpers.mjs';
const create = extra => createSession({ decode: async (_, h) => frame(h.width, h.height), ...extra });
async function ready(session) { await session.select(0, [file()]); await session.select(1, [file()]); }
test('complete source pair and render lifecycle', async () => {
  const session = create(); assert.equal(session.snapshot().status, 'idle');
  await ready(session); assert.equal(session.snapshot().status, 'ready');
  assert.equal((await session.generate()).ok, true); assert.equal(session.snapshot().status, 'success');
  assert.equal(session.snapshot().result.data.length, 8);
});
test('settings change invalidates result synchronously', async () => {
  const session = create(); await ready(session); await session.generate();
  session.update({ opacity: 0 }); assert.equal(session.snapshot().result, null);
  assert.equal(session.snapshot().settings.opacity, 0);
});
test('invalid settings cannot silently generate previous valid settings', async () => {
  const session = create(); await ready(session); await session.generate();
  assert.equal(session.update({ opacity: NaN }), false); assert.equal(session.snapshot().result, null);
  assert.deepEqual(await session.generate(), { ok: false, code: 'SETTINGS' });
  session.update({ opacity: 100 }); assert.equal((await session.generate()).ok, true);
});
test('invalid file replacement clears old slot and result', async () => {
  const session = create(); await ready(session); await session.generate();
  assert.equal((await session.select(1, [file(new Uint8Array())])).code, 'EMPTY');
  assert.equal(session.snapshot().sources[1], null); assert.equal(session.snapshot().result, null);
});
test('multiple and oversized files never decoded', async () => {
  let calls = 0; const session = create({ decode: () => { calls++; } });
  assert.equal((await session.select(0, [file(), file()])).code, 'COUNT');
  assert.equal((await session.select(0, [{ size: LIMITS.bytes + 1, arrayBuffer() { throw Error('read'); } }])).code, 'FILE_SIZE');
  assert.equal(calls, 0);
});
test('claimed file size must equal bytes read', async () => {
  const session = create(); const fake = file(); fake.size++;
  assert.equal((await session.select(0, [fake])).code, 'CORRUPT');
});
test('mismatch is explicit and no preview can be produced', async () => {
  const session = create(); await session.select(0, [file()]); await session.select(1, [file(png(1, 2))]);
  assert.equal(session.snapshot().code, 'MISMATCH'); assert.equal((await session.generate()).code, 'MISMATCH');
  assert.equal(session.snapshot().result, null);
});
test('orientation swap allowed, arbitrary decoder shape rejected', async () => {
  const session = create({ decode: async () => frame(1, 2) });
  assert.equal((await session.select(0, [file()])).ok, true);
  const bad = create({ decode: async () => frame(3, 1) });
  assert.equal((await bad.select(0, [file()])).code, 'CORRUPT');
});
test('decoder error maps safely without raw exception text', async () => {
  const session = create({ decode: async () => { throw Error('<script>secret</script>'); } });
  assert.equal((await session.select(0, [file()])).code, 'DECODE'); assert.equal(session.snapshot().sources[0], null);
});
test('cancel while reading settles immediately and late read never decodes', async () => {
  const reading = deferred(); let calls = 0;
  const session = create({ decode: async () => { calls++; return frame(); } });
  const selected = session.select(0, [{ ...file(), arrayBuffer: () => reading.promise }]);
  session.cancel(); assert.equal((await selected).code, 'CANCELLED');
  reading.resolve(png().buffer); await tick(); assert.equal(calls, 0); assert.equal(session.snapshot().sources[0], null);
});
test('late decoder resolution cannot reintroduce a cancelled source', async () => {
  const decoding = deferred(); const session = create({ decode: () => decoding.promise });
  const selected = session.select(0, [file()]); await tick(); session.clear();
  decoding.resolve(frame()); assert.equal((await selected).code, 'CANCELLED'); await tick();
  assert.equal(session.snapshot().status, 'idle'); assert.equal(session.snapshot().sources[0], null);
});
test('late decoder rejection does not overwrite a newer error', async () => {
  const decoding = deferred(); const session = create({ decode: () => decoding.promise });
  const selected = session.select(0, [file()]); await tick();
  await session.select(0, []); decoding.reject(Error('bad')); await selected; await tick();
  assert.equal(session.snapshot().code, 'COUNT');
});
test('only latest queued selection decodes; never overlaps', async () => {
  const first = deferred(); let calls = 0, inFlight = 0, max = 0;
  const session = create({ decode: async () => { calls++; inFlight++; max = Math.max(max, inFlight); if (calls === 1) await first.promise; inFlight--; return frame(); } });
  const a = session.select(0, [file(png(), 'A')]); await tick(); session.cancel();
  const b = session.select(0, [file(png(), 'B')]);
  const c = session.select(0, [file(png(), 'C')]);
  assert.equal((await a).code, 'CANCELLED'); assert.equal((await b).code, 'CANCELLED'); assert.equal(calls, 1);
  first.resolve(); assert.equal((await c).ok, true); assert.equal(calls, 2); assert.equal(max, 1);
  assert.equal(session.snapshot().sources[0].name, 'C');
});
test('late render cannot publish after settings change', async () => {
  const drawing = deferred(); const session = create({ render: () => drawing.promise });
  await ready(session); const job = session.generate(); await tick(); session.update({ mode: 'difference' });
  assert.equal((await job).code, 'CANCELLED'); drawing.resolve(frame()); await tick();
  assert.equal(session.snapshot().result, null); assert.equal(session.snapshot().settings.mode, 'difference');
});
test('render failure and bad renderer result leave no output', async () => {
  for (const render of [async () => { throw Error('allocation'); }, async () => frame(1, 1)]) {
    const session = create({ render }); await ready(session); assert.equal((await session.generate()).code, 'RENDER'); assert.equal(session.snapshot().result, null);
  }
});
test('clear resets settings and names remain text data', async () => {
  const session = create(); const name = '<img src=x onerror=alert(1)>.png';
  await session.select(0, [file(png(), name)]); assert.equal(session.snapshot().sources[0].name, name);
  session.update({ mode: 'difference', opacity: 90 }); session.clear();
  assert.deepEqual(session.snapshot().settings, { mode: 'overlay', opacity: 50 }); assert.deepEqual(session.snapshot().sources, [null, null]);
});
test('dispose rejects new work and stale callback stays quiet', async () => {
  const reading = deferred(); let changes = 0;
  const session = create({ onChange: () => changes++ });
  const selected = session.select(0, [{ ...file(), arrayBuffer: () => reading.promise }]); session.dispose();
  const count = changes; reading.resolve(png().buffer); await selected; await tick();
  assert.equal(changes, count); assert.equal((await session.select(0, [file()])).code, 'CANCELLED');
});
