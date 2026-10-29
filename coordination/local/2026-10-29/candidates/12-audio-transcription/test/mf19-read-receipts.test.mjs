import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { AssetLoader } from '../public/js/asset-loader.mjs';
import { SELECTED_MODEL, REQUIRED_ASSET_PATHS } from '../public/js/core/manifest.mjs';
import { enableMemoryTrace, disableMemoryTrace, createReadReceipt, READ_EVENT, READ_REASON } from '../public/js/core/memory-phases.mjs';

afterEach(() => disableMemoryTrace());
const body = '{}', sha256 = createHash('sha256').update(body).digest('hex');
const mime = item => item.endsWith('.json') ? 'application/json' : item.endsWith('.wasm') ? 'application/wasm' : item.endsWith('.onnx') ? 'application/octet-stream' : /\.m?js$/u.test(item) ? 'text/javascript' : 'text/plain';
const manifest = () => ({ schemaVersion: 1, ...SELECTED_MODEL, dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' }, files: REQUIRED_ASSET_PATHS.map(path => ({ path, bytes: 2, sha256, mime: mime(path) })) });
const loaderFor = fetchImpl => new AssetLoader({ origin: 'http://127.0.0.1:5192', fetchImpl });
const observe = () => { disableMemoryTrace(); const records = []; enableMemoryTrace(record => records.push(record)); return records; };

test('read receipts require opt-in and reject content, mutable identities and unknown codes', () => {
  disableMemoryTrace(); assert.equal(createReadReceipt({}), undefined);
  const records = observe();
  const receipt = createReadReceipt({ scopeCode: 1, ordinal: 1, readId: 1, expectedBytes: 2, hasSignal: 1 });
  assert(Object.isFrozen(receipt)); assert.deepEqual(Object.keys(receipt), ['update', 'record']);
  for (const values of [{ body: 'FAKE_CONTENT_CANARY' }, { receivedBytes: -1 }, { eof: 2 }, { reasonCode: 99 }, { outcomeCode: 3 }, { [Symbol('input')]: 1 }]) assert.throws(() => receipt.update(values), /READ_RECEIPT_RECORD_INVALID/u);
  assert.throws(() => receipt.update({ ordinal: 2 }), /IDENTITY_INVALID/u);
  assert.throws(() => receipt.record(99), /EVENT_INVALID/u);
  receipt.record(READ_EVENT.EOF, { receivedBytes: 2, eof: 1, readerLocked: 1, lockObserved: 1 });
  assert(records.every(item => Object.isFrozen(item) && Object.entries(item).every(([key, value]) => key === 'phase' ? value === 'read-receipt' : typeof value === 'number' && Number.isFinite(value))));
  assert(!JSON.stringify(records).includes('FAKE_CONTENT_CANARY'));
});

test('native Response EOF and SHA receipts cover all 19 assets without cancelling or releasing locks', async () => {
  const records = observe(), responses = []; let cancels = 0;
  const loader = loaderFor(async () => {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(body)); controller.close(); }, cancel() { cancels += 1; } });
    const response = new Response(stream, { headers: { 'Content-Length': '2' } }); responses.push(response); return response;
  });
  const result = await loader.load(manifest());
  assert.equal(result.loadedBytes, 38); assert.equal(cancels, 0); assert.equal(responses.length, 19);
  assert(responses.every(response => response.body.locked));
  for (let ordinal = 1; ordinal <= 19; ordinal += 1) {
    const read = records.filter(item => item.phase === 'read-receipt' && item.ordinal === ordinal);
    assert.deepEqual(read.map(item => item.eventCode), [1, 2, 3, 4, 8]);
    assert(read.every(item => item.scopeCode === 1 && item.readId === ordinal && item.expectedBytes === 2 && item.hasSignal === 1));
    assert.equal(read.at(-1).receivedBytes, 2); assert.equal(read.at(-1).eof, 1);
    assert.equal(read.at(-1).hashChecked, 1); assert.equal(read.at(-1).hashOk, 1);
    assert.equal(read.at(-1).readerLocked, 1); assert.equal(read.at(-1).lockObserved, 1);
    assert.equal(read.at(-1).signalAborted, 0); assert.equal(read.at(-1).reasonCode, 0); assert.equal(read.at(-1).outcomeCode, 1);
    assert(read.every((item, index) => index === 0 || item.monotonicMs >= read[index - 1].monotonicMs));
  }
});

test('fixed failure reasons retain original integrity errors and report bytes actually copied', async () => {
  for (const [response, reasonCode, receivedBytes, eof, hashChecked] of [
    [new Response(body, { headers: { 'Content-Length': '3' } }), READ_REASON.HEADER_LENGTH, 0, 0, 0],
    [new Response('{}x'), READ_REASON.SIZE_CAP, 0, 0, 0],
    [new Response('{'), READ_REASON.SHORT_READ, 1, 1, 0],
    [new Response('{x'), READ_REASON.HASH_MISMATCH, 2, 1, 1],
  ]) {
    const records = observe(), loader = loaderFor(async () => response);
    await assert.rejects(loader.load(manifest()), /ASSET_INTEGRITY_FAILED/u);
    const finish = records.find(item => item.eventCode === READ_EVENT.FINISH);
    assert.equal(finish.reasonCode, reasonCode); assert.equal(finish.receivedBytes, receivedBytes);
    assert.equal(finish.eof, eof); assert.equal(finish.hashChecked, hashChecked);
    assert.equal(finish.hashOk, 0); assert.equal(finish.outcomeCode, 2); assert.equal(loader.verified.size, 0);
    assert.equal(records.filter(item => item.eventCode === READ_EVENT.CANCEL_CALLED).length, [READ_REASON.HEADER_LENGTH, READ_REASON.SIZE_CAP].includes(reasonCode) ? 1 : 0);
    assert(records.some(item => item.eventCode === READ_EVENT.ABORT_SIGNALLED && item.reasonCode === READ_REASON.LOAD_ERROR));
  }
});

test('caller abort receipts precede error and preserve signal state without logging an exception body', async () => {
  const records = observe(), controller = new AbortController();
  const loader = loaderFor(async () => new Response(body));
  await assert.rejects(loader.load(manifest(), { signal: controller.signal, onProgress: () => controller.abort() }), /MODEL_LOAD_FAILED/u);
  const abort = records.find(item => item.eventCode === READ_EVENT.ABORT_SIGNALLED);
  const finish = records.find(item => item.eventCode === READ_EVENT.FINISH);
  assert.equal(abort.reasonCode, READ_REASON.CALLER_SIGNAL); assert.equal(abort.signalAborted, 1); assert.equal(abort.lockObserved, 0);
  assert.equal(finish.reasonCode, READ_REASON.CALLER_SIGNAL); assert.equal(finish.signalAborted, 1); assert.equal(finish.receivedBytes, 2);
  assert.equal(finish.outcomeCode, 2); assert.equal(loader.verified.size, 0);
});

test('off and throwing observer paths preserve the existing load result', async () => {
  disableMemoryTrace();
  const off = loaderFor(async () => new Response(body));
  assert.equal((await off.load(manifest())).loadedBytes, 38); assert.equal(off.nextReceiptId, 0);
  enableMemoryTrace(() => { throw new Error('FAKE_OBSERVER_EXCEPTION'); });
  const on = loaderFor(async () => new Response(body));
  assert.equal((await on.load(manifest())).loadedBytes, 38); assert.equal(on.verified.size, 19);
});

test('timeout uses its fixed abort reason without waiting or creating a network connection', async t => {
  const records = observe();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const loader = loaderFor((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('FAKE_PRIVATE_EXCEPTION')), { once: true })));
  const loading = loader.load(manifest()); t.mock.timers.tick(180000);
  await assert.rejects(loading, /MODEL_LOAD_FAILED/u);
  assert(records.some(item => item.eventCode === READ_EVENT.ABORT_SIGNALLED && item.reasonCode === READ_REASON.TIMEOUT));
  assert.equal(records.find(item => item.eventCode === READ_EVENT.FINISH).signalAborted, 1);
  assert(!JSON.stringify(records).includes('FAKE_PRIVATE_EXCEPTION'));
});

test('HTTP rejection has a fixed reason and does not claim EOF or a checked hash', async () => {
  const records = observe(), loader = loaderFor(async () => new Response(null, { status: 404 }));
  await assert.rejects(loader.load(manifest()), /MODEL_LOAD_FAILED/u);
  const finish = records.find(item => item.eventCode === READ_EVENT.FINISH);
  assert.equal(finish.reasonCode, READ_REASON.RESPONSE_REJECTED); assert.equal(finish.eof, 0); assert.equal(finish.hashChecked, 0);
});
