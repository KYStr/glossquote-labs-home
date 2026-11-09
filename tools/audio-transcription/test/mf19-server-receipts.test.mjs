import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { attachSpikeDiagnostics, SERVER_EVENT } from '../scripts/serve-spike.mjs';

// Pure logger tests: no listener, browser, model or OS process sampling.
function fixture() {
  const request = { aborted: false }, response = new EventEmitter(), calls = [];
  Object.assign(response, {
    statusCode: 200, writableFinished: false, writableEnded: false,
    write(...args) { calls.push({ method: 'write', self: this, args }); return false; },
    end(...args) { calls.push({ method: 'end', self: this, args }); if (args[0]) this.write(...args); const callback = args.find(item => typeof item === 'function'); callback?.(); this.writableEnded = true; this.writableFinished = true; this.emit('finish'); return this; },
  });
  return { request, response, calls };
}

test('default logger mode adds no hooks, wrappers or records', () => {
  const { request, response } = fixture(), write = response.write, end = response.end;
  attachSpikeDiagnostics(request, response);
  assert.equal(response.write, write); assert.equal(response.end, end);
  assert.equal(response.listenerCount('finish'), 0); assert.equal(response.listenerCount('close'), 0);
});

test('received, finish and close stay separate with submitted bytes and original return/callback semantics', () => {
  const { request, response, calls } = fixture(), records = []; let declared = 0, callbackCalls = 0;
  attachSpikeDiagnostics(request, response, { requestId: 3, pathOrdinal: 6, declaredBytes: () => declared, onRecord: record => records.push(record) });
  assert.equal(response.write(Buffer.from([1, 2, 3])), false);
  declared = 6; assert.equal(response.end('中', 'utf8', () => { callbackCalls += 1; }), response);
  response.emit('close');
  assert.deepEqual(records.map(item => item.eventCode), [SERVER_EVENT.RECEIVED, SERVER_EVENT.FINISH, SERVER_EVENT.CLOSE]);
  assert.equal(records[0].bodyBytesSubmitted, 0); assert.equal(records[0].statusCode, 0);
  assert.equal(records[1].bodyBytesSubmitted, 6); assert.equal(records[2].bodyBytesSubmitted, 6);
  assert.equal(records[1].declaredBodyBytes, 6); assert.equal(records[1].writableFinished, 1); assert.equal(records[2].writableEnded, 1);
  assert.equal(callbackCalls, 1); assert(calls.every(item => item.self === response));
  assert(records.every(item => Object.isFrozen(item) && Object.entries(item).every(([key, value]) => key === 'phase' ? value === 'server-receipt' : typeof value === 'number' && Number.isFinite(value))));
  assert(!JSON.stringify(records).includes('中'));
});

test('premature close records aborted request and unfinished response without inventing finish', () => {
  const { request, response } = fixture(), records = [];
  attachSpikeDiagnostics(request, response, { requestId: 4, pathOrdinal: 0, declaredBytes: () => 100, onRecord: record => records.push(record) });
  response.write(new Uint8Array(5)); request.aborted = true; response.emit('close');
  assert.deepEqual(records.map(item => item.eventCode), [1, 3]);
  assert.equal(records[1].bodyBytesSubmitted, 5); assert.equal(records[1].declaredBodyBytes, 100);
  assert.equal(records[1].writableFinished, 0); assert.equal(records[1].requestAborted, 1);
});

test('failed writes preserve the original error and do not count rejected submissions', () => {
  const { request, response } = fixture(), records = [], error = new Error('FAKE_WRITE_ERROR');
  response.write = () => { throw error; };
  attachSpikeDiagnostics(request, response, { requestId: 1, pathOrdinal: 1, declaredBytes: () => 0, onRecord: record => records.push(record) });
  assert.throws(() => response.write('fake'), candidate => candidate === error); response.emit('close');
  assert.equal(records.at(-1).bodyBytesSubmitted, 0); assert(!JSON.stringify(records).includes('FAKE_WRITE_ERROR'));
});
