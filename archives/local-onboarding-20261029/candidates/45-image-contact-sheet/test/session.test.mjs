import test from 'node:test';
import assert from 'node:assert/strict';
import { ContactSheetSession, DownloadUrls } from '../public/js/core/session.mjs';
import { fakeFile } from './fixtures/images.mjs';
import { FakeCanvas, bitmap, deferred, tick, fakeUrls } from './fixtures/browser-fakes.mjs';

function fixture(options = {}) {
  const canvas = options.canvas ?? new FakeCanvas(), urls = fakeUrls(), states = [];
  const session = new ContactSheetSession({ canvas, decode: async (f) => bitmap(f.name, 3, 2),
    yieldControl: async () => {}, urls: new DownloadUrls(urls.config),
    onChange: (s) => states.push(s.phase), ...options });
  return { session, canvas, urls, states };
}
test('selection completes every header preflight before the first fake decode; invalid file yields no partial result', async () => {
  const events = [], { session, canvas } = fixture({ decode: async (f) => { events.push('decode:' + f.name); return bitmap(f.name, 3, 2); } });
  const files = ['A.png', 'B.png', 'C.png'].map((n) => fakeFile(n));
  for (const f of files) { const read = f.arrayBuffer.bind(f); f.arrayBuffer = async () => { events.push('read:' + f.name); return read(); }; }
  await session.replaceFiles(files); assert.deepEqual(events, ['read:A.png', 'read:B.png', 'read:C.png']);
  await session.generate(); assert.deepEqual(events, ['read:A.png', 'read:B.png', 'read:C.png', 'decode:A.png', 'decode:B.png', 'decode:C.png']);
  await session.replaceFiles([files[0], fakeFile('<script>.png', Buffer.from('<svg/>'))]);
  assert.equal(session.phase, 'blocked'); assert.equal(session.result, null); assert.equal(session.items.length, 0);
  const count = events.length; await session.generate(); assert.equal(events.length, count + 1);
  assert.equal(session.result, null); assert.equal(canvas.width, 0);
});
test('input, column, filename and order changes synchronously clear output and revoke URLs', async () => {
  const { session, canvas, urls } = fixture();
  await session.replaceFiles([fakeFile('A.png'), fakeFile('B.png')]);
  await session.generate(); assert.equal(session.phase, 'result');
  assert.equal(urls.created.length, 0); // no preview object URL
  const downloads = [];
  session.download('png', (...args) => downloads.push(args)); session.download('text', (...args) => downloads.push(args));
  assert.deepEqual(downloads.map((d) => d[1]), ['photo-contact-sheet.png', 'photo-contact-sheet-index.txt']);
  session.setOptions({ columns: 1 });
  assert.equal(session.result, null); assert.equal(canvas.width, 0); assert.equal(urls.revoked.length, 2);
  assert.equal(session.download('png', () => assert.fail()), false);
  await session.generate(); session.setOptions({ showNames: true }); assert.equal(session.result, null);
  await session.generate(); session.reorder(0, 1); assert.equal(session.result, null);
  await session.generate();
  assert.equal(new TextDecoder().decode(session.result.indexText), 'Photo contact sheet index v1\n1\t"B.png"\t3x2\n2\t"A.png"\t3x2\n');
  const replacing = session.replaceFiles([fakeFile('New.png')]); assert.equal(session.result, null); await replacing;
});
test('A17: cancellation waits for late decode, closes it exactly once, no resurrection', async () => {
  const gate = deferred(); let decodes = 0;
  const { session, canvas, urls, states } = fixture({ decode: () => { decodes++; return gate.promise; } });
  await session.replaceFiles([fakeFile('A.png'), fakeFile('B.png')]);
  const task = session.generate(); session.cancel();
  assert.equal(session.phase, 'cancelling'); assert.equal(session.busy, true);
  await session.generate(); assert.equal(decodes, 1);
  const late = bitmap('late', 3, 2); gate.resolve(late); await task;
  assert.equal(late.closes, 1); assert.equal(canvas.draws.length, 0); assert.equal(session.result, null);
  assert.equal(session.phase, 'stale'); assert.equal(session.busy, false); assert.equal(urls.created.length, 0);
  assert.equal(states.includes('result'), false);
});
test('A18: change columns during encoding; late callback never becomes result', async () => {
  const canvas = new FakeCanvas({ deferEncode: true }); const { session, states } = fixture({ canvas });
  await session.replaceFiles([fakeFile('A.png'), fakeFile('B.png')]);
  const task = session.generate(); await tick();
  assert.equal(session.phase, 'encoding'); session.setOptions({ columns: 1 });
  assert.equal(session.phase, 'cancelling'); assert.equal(session.result, null);
  canvas.callback(new Blob(['fake'], { type: 'image/png' })); await task;
  assert.equal(session.result, null); assert.equal(canvas.width, 0); assert.equal(states.includes('result'), false);
});
test('queued source replacement waits for rejected/late decode and keeps canvas ownership serial', async () => {
  const gate = deferred(); let calls = 0;
  const { session, canvas } = fixture({ decode: async (file) => { calls++; if (calls === 1) return gate.promise; return bitmap(file.name, 3, 2); } });
  await session.replaceFiles([fakeFile('Old.png')]); const old = session.generate();
  const next = fakeFile('New.png'); const replacement = session.replaceFiles([next]);
  await tick(); assert.equal(next.reads, 0); assert.equal(calls, 1);
  gate.reject(new Error('synthetic late decoder failure')); await old; await replacement;
  assert.equal(session.phase, 'ready'); assert.equal(next.reads, 1);
  await session.generate(); assert.equal(session.phase, 'result'); assert.equal(canvas.draws.length, 1);
  assert.equal(canvas.draws[0][0].id, 'New.png');
});
test('multiple rapid selections discard superseded preflight and never read its files', async () => {
  const gate = deferred(), original = fakeFile('original.png');
  const read = original.arrayBuffer.bind(original); original.arrayBuffer = () => gate.promise;
  const { session } = fixture(); const a = session.replaceFiles([original]);
  await tick(); const bFile = fakeFile('B.png'), cFile = fakeFile('C.png');
  const b = session.replaceFiles([bFile]); const c = session.replaceFiles([cFile]);
  gate.resolve(await read()); await Promise.all([a, b, c]);
  assert.equal(bFile.reads, 0); assert.equal(cFile.reads, 1); assert.equal(session.files[0], cFile); assert.equal(session.phase, 'ready');
});
test('A20: reset/pagehide disposes files, canvas, Blob refs and URL timers idempotently', async () => {
  const { session, canvas, urls } = fixture();
  await session.replaceFiles([fakeFile('A.png')]); await session.generate(); session.download('png', () => {});
  session.reset(); session.reset();
  assert.equal(session.files.length, 0); assert.equal(session.items.length, 0); assert.equal(session.result, null);
  assert.equal(canvas.width, 0); assert.equal(canvas.height, 0); assert.equal(urls.revoked.length, 1); assert.equal(urls.timers.size, 0);
  await session.replaceFiles([fakeFile('B.png')]); await session.generate(); session.download('text', () => {});
  session.dispose(); session.dispose();
  assert.equal(urls.revoked.length, 2); assert.equal(session.result, null); assert.equal(session.files.length, 0);
  await session.replaceFiles([fakeFile('ignored.png')]); await session.generate(); assert.equal(session.files.length, 0);
});
test('reset/pagehide while decode is pending: late bitmap closes, source references stay cleared', async () => {
  for (const action of ['reset', 'dispose']) {
    const gate = deferred(); const { session, canvas } = fixture({ decode: () => gate.promise });
    await session.replaceFiles([fakeFile('A.png')]); const task = session.generate(); session[action]();
    assert.equal(session.files.length, 0); assert.equal(session.items.length, 0); assert.equal(session.result, null);
    const late = bitmap('late', 3, 2); gate.resolve(late); await task;
    assert.equal(late.closes, 1); assert.equal(canvas.width, 0); assert.equal(canvas.height, 0); assert.equal(session.result, null);
  }
});
test('download fallback fires at 60s and revokes each URL once, repeated release/clear is safe', () => {
  const fake = fakeUrls(), urls = new DownloadUrls(fake.config);
  const url = urls.add(new Blob(['fake'])); assert.equal(fake.created.length, 1);
  const callback = [...fake.timers.values()][0]; callback(); urls.release(url); urls.clear(); callback();
  assert.deepEqual(fake.revoked, [url]); assert.equal(fake.timers.size, 0);
});
test('selection/column defaults normalize; failures never retain the previous successful result', async () => {
  const { session, canvas } = fixture();
  await session.replaceFiles([fakeFile('A.png'), fakeFile('B.png'), fakeFile('C.png')]);
  session.setOptions({ columns: 6 }); assert.equal(session.options.columns, 3);
  await session.generate(); assert.equal(session.phase, 'result');
  canvas.blob = null; await session.generate(); assert.equal(session.phase, 'failed'); assert.equal(session.result, null);
  await session.replaceFiles(Array.from({ length: 31 }, (_, i) => fakeFile(`${i}.png`)));
  assert.equal(session.phase, 'blocked'); assert.equal(session.error.code, 'TOO_MANY_FILES'); assert.equal(session.result, null);
});
