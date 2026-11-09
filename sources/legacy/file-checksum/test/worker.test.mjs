import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { webcrypto, createHash } from 'node:crypto';
import { createWorkerHandler, validateWorkerRequest } from '../public/js/hash.worker.mjs';
import { WORKER_SOURCE } from '../public/js/worker-source.mjs';
import { validateWorkerReply } from '../public/js/core/session.mjs';
import { generateWorkerSource, verifyWorkerSource, renderWorkerSource } from '../scripts/build-worker.mjs';
import { validateProject, APPROVED_ASSETS } from '../scripts/check.mjs';
import { buildPreview } from '../scripts/build.mjs';
import { ValidationError } from '../scripts/validation.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const VECTORS = [
  { name: 'empty', bytes: [], hex: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
  { name: 'abc', bytes: [0x61, 0x62, 0x63], hex: ABC },
  { name: 'abc with LF', bytes: [0x61, 0x62, 0x63, 0x0a], hex: 'edeaaff3f1774ad2888673770c6d64097e391bc362d7d6fb34982ddf0efd18cb' },
  { name: 'binary including BOM bytes', bytes: [0x00, 0xff, 0x80, 0x0d, 0x0a, 0xef, 0xbb, 0xbf], hex: 'ef7599427575c12d74a02c29d770363b67b7b4ab158aa04464938118c8f13003' },
];
function harness(overrides = {}) {
  const messages = [];
  let closeCount = 0;
  const scope = { File, crypto: webcrypto, isSecureContext: true,
    postMessage(message) { messages.push(structuredClone(message)); }, close() { closeCount += 1; }, ...overrides };
  return { scope, messages, handle: createWorkerHandler(scope), get closeCount() { return closeCount; } };
}
function fakeFile(bytes = [0x61, 0x62, 0x63], name = 'FAKE_TEST_NAME.bin', options = {}) {
  return new File([Uint8Array.from(bytes)], name, options);
}
function deferred() { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function terminal(h, code, jobId = 1) {
  assert.deepEqual(h.messages.at(-1), { type: 'error', jobId, code });
  assert.equal(h.closeCount, 1);
  assert.equal(h.messages.some(message => message.type === 'done'), false);
  assert.doesNotMatch(JSON.stringify(h.messages), /FAKE_TEST_NAME|FAKE_RAW|FAKE_READ|FAKE_DIGEST/);
}
const validationCode = code => error => error instanceof ValidationError && error.code === code;

test('automatic Node WebCrypto hashes fixed raw-byte vectors through the worker handler', async t => {
  for (const vector of VECTORS) await t.test(vector.name, async () => {
    let calls = 0;
    const h = harness({ crypto: { subtle: { async digest(algorithm, bytes) {
      calls += 1;
      assert.equal(algorithm, 'SHA-256');
      assert.deepEqual([...new Uint8Array(bytes)], vector.bytes);
      return webcrypto.subtle.digest(algorithm, bytes);
    } } } });
    const file = fakeFile(vector.bytes);
    const request = Object.freeze({ type: 'hash', jobId: 1, file });
    await h.handle(request);
    assert.deepEqual(h.messages, [
      { type: 'stage', jobId: 1, stage: 'reading' },
      { type: 'stage', jobId: 1, stage: 'hashing' },
      { type: 'done', jobId: 1, hex: vector.hex, bytes: vector.bytes.length },
    ]);
    assert.equal(calls, 1);
    assert.equal(h.closeCount, 1);
    assert.equal(request.file, file);
    for (const message of h.messages) assert.deepEqual(validateWorkerReply(message, { jobId: 1, fileSize: file.size }), message);
    await h.handle({ type: 'hash', jobId: 2, file });
    assert.equal(calls, 1);
    assert.equal(h.messages.length, 3);
  });
});

test('automatic handler ignores filename, MIME and mtime; only identical bytes matter', async () => {
  for (const [name, type, lastModified] of [['first.bin', '', 1], ['renamed.zip', 'application/zip', 9999], ['FAKE_TEST_NAME_<script>\u202e.bin', 'text/plain', 0]]) {
    const h = harness();
    const file = fakeFile([0x61, 0x62, 0x63], name, { type, lastModified });
    await h.handle({ type: 'hash', jobId: 1, file });
    assert.deepEqual(h.messages.at(-1), { type: 'done', jobId: 1, hex: ABC, bytes: 3 });
    assert.doesNotMatch(JSON.stringify(h.messages), /first\.bin|renamed\.zip|FAKE_TEST_NAME|application\/zip|<script>/);
  }
});

test('request exact schema rejects unknown keys/brands/types, including hidden and symbol fields', async () => {
  const file = fakeFile();
  const valid = { type: 'hash', jobId: 1, file };
  const malformed = [
    { ...valid, extra: true }, { ...valid, type: 'sha256' }, { ...valid, file: new Blob(['abc']) },
    { ...valid, file: { size: 3, arrayBuffer() { throw new Error('FAKE_READ_SHOULD_NOT_RUN'); } } },
    { ...valid, file: null }, Object.defineProperty({ ...valid }, 'hidden', { value: true }),
    { ...valid, [Symbol('hidden')]: true }, { type: 'hash', jobId: 1 },
  ];
  for (const request of malformed) {
    assert.throws(() => validateWorkerRequest(request), error => error.code === 'WORKER_PROTOCOL');
    const h = harness(); await h.handle(request); terminal(h, 'WORKER_PROTOCOL');
  }
  const frozen = Object.freeze(valid);
  assert.deepEqual(validateWorkerRequest(frozen), valid);
  assert.equal(Object.isFrozen(validateWorkerRequest(frozen)), true);
  const nullPrototype = Object.assign(Object.create(null), valid);
  const h = harness(); await h.handle(nullPrototype);
  assert.equal(h.messages.at(-1).hex, ABC);
});

test('no valid job ID closes without inventing a reply ID or invoking property getters', async () => {
  for (const jobId of [0, -1, 1.5, NaN, Infinity, '1', Number.MAX_SAFE_INTEGER + 1, null, undefined]) {
    const h = harness(); await h.handle({ type: 'hash', jobId, file: fakeFile() });
    assert.deepEqual(h.messages, []);
    assert.equal(h.closeCount, 1);
  }
  for (const request of [null, [], {}, true, 'fake']) {
    const h = harness(); await h.handle(request);
    assert.deepEqual(h.messages, []); assert.equal(h.closeCount, 1);
  }
  let getterCalls = 0;
  const request = { type: 'hash', get jobId() { getterCalls += 1; throw new Error('FAKE_RAW_GETTER'); }, file: fakeFile() };
  const h = harness(); await h.handle(request);
  assert.equal(getterCalls, 0);
  assert.deepEqual(h.messages, []);
  assert.equal(h.closeCount, 1);
});

test('worker rechecks size without allocating a 128MiB buffer; +1 never reads bytes', async () => {
  let reads = 0;
  class SizedFile extends File {
    constructor(size) { super([], 'FAKE_TEST_NAME.bin'); this.syntheticSize = size; }
    get size() { return this.syntheticSize; }
    async arrayBuffer() { reads += 1; return new ArrayBuffer(0); }
  }
  const boundary = new SizedFile(134217728);
  assert.doesNotThrow(() => validateWorkerRequest({ type: 'hash', jobId: 1, file: boundary }));
  assert.equal(reads, 0);
  for (const [size, code] of [[134217729, 'SIZE_LIMIT'], [-1, 'SIZE_INVALID'], [0.1, 'SIZE_INVALID'], [NaN, 'SIZE_INVALID'], [Number.MAX_SAFE_INTEGER + 1, 'SIZE_INVALID']]) {
    const h = harness(); await h.handle({ type: 'hash', jobId: 1, file: new SizedFile(size) });
    terminal(h, code); assert.equal(reads, 0);
    assert.equal(h.messages.length, 1);
  }
});

test('secure context, worker WebCrypto, File and arrayBuffer must actually be available', async () => {
  const cases = [
    { isSecureContext: false }, { isSecureContext: undefined }, { crypto: undefined },
    { crypto: { subtle: {} } }, { crypto: { subtle: { digest: 'not callable' } } }, { File: undefined },
  ];
  for (const overrides of cases) {
    const h = harness(overrides); await h.handle({ type: 'hash', jobId: 1, file: fakeFile() });
    terminal(h, 'UNSUPPORTED_ENVIRONMENT'); assert.equal(h.messages.length, 1);
  }
  const file = fakeFile(); Object.defineProperty(file, 'arrayBuffer', { value: undefined });
  const h = harness(); await h.handle({ type: 'hash', jobId: 1, file }); terminal(h, 'UNSUPPORTED_ENVIRONMENT');
});

test('arrayBuffer rejection maps only to READ_FAILED; size/type mismatch remains distinct', async () => {
  let digestCalls = 0;
  const crypto = { subtle: { async digest() { digestCalls += 1; throw new Error('FAKE_DIGEST_SHOULD_NOT_RUN'); } } };
  class RejectedRead extends File { async arrayBuffer() { const error = new Error('FAKE_READ_PRIVATE_FAILURE'); error.code = 'HASH_LENGTH'; throw error; } }
  const h = harness({ crypto }); await h.handle({ type: 'hash', jobId: 1, file: new RejectedRead(['abc'], 'FAKE_TEST_NAME.bin') });
  terminal(h, 'READ_FAILED');
  assert.deepEqual(h.messages[0], { type: 'stage', jobId: 1, stage: 'reading' });
  for (const result of [new ArrayBuffer(2), new ArrayBuffer(4), Uint8Array.from([0x61, 0x62, 0x63]), null]) {
    class IncompleteRead extends File { async arrayBuffer() { return result; } }
    const h = harness({ crypto }); await h.handle({ type: 'hash', jobId: 1, file: new IncompleteRead(['abc'], 'FAKE_TEST_NAME.bin') });
    terminal(h, 'READ_SIZE_MISMATCH');
    assert.equal(h.messages.length, 2);
  }
  assert.equal(digestCalls, 0);
});

test('digest rejection maps only to HASH_FAILED; 31/33 bytes or wrong type is HASH_LENGTH', async () => {
  const rejected = harness({ crypto: { subtle: { async digest() { throw new Error('FAKE_RAW_DIGEST_FAILURE'); } } } });
  await rejected.handle({ type: 'hash', jobId: 1, file: fakeFile() }); terminal(rejected, 'HASH_FAILED');
  for (const result of [new ArrayBuffer(31), new ArrayBuffer(33), new Uint8Array(32), null]) {
    const h = harness({ crypto: { subtle: { async digest() { return result; } } } });
    await h.handle({ type: 'hash', jobId: 1, file: fakeFile() }); terminal(h, 'HASH_LENGTH');
    assert.deepEqual(h.messages.slice(0, 2), [{ type: 'stage', jobId: 1, stage: 'reading' }, { type: 'stage', jobId: 1, stage: 'hashing' }]);
  }
});

test('second request while reading closes one lifetime; late read cannot hash or complete', async () => {
  const read = deferred(); let digestCalls = 0; let secondReads = 0;
  class DeferredRead extends File { arrayBuffer() { return read.promise; } }
  class SecondFile extends File { arrayBuffer() { secondReads += 1; return super.arrayBuffer(); } }
  const h = harness({ crypto: { subtle: { async digest() { digestCalls += 1; return new ArrayBuffer(32); } } } });
  const first = h.handle({ type: 'hash', jobId: 1, file: new DeferredRead(['abc'], 'fake-first.bin') });
  await h.handle({ type: 'hash', jobId: 2, file: new SecondFile(['abc'], 'fake-second.bin') });
  read.resolve(Uint8Array.from([0x61, 0x62, 0x63]).buffer); await first;
  assert.deepEqual(h.messages, [{ type: 'stage', jobId: 1, stage: 'reading' }, { type: 'error', jobId: 2, code: 'WORKER_PROTOCOL' }]);
  assert.equal(digestCalls, 0); assert.equal(secondReads, 0); assert.equal(h.closeCount, 1);
});

test('second request while digest pending suppresses its eventual success and error', async () => {
  for (const rejectDigest of [false, true]) {
    const digest = deferred(); const hashing = deferred();
    const h = harness({ crypto: { subtle: { digest() { return digest.promise; } } } });
    const originalPost = h.scope.postMessage;
    h.scope.postMessage = message => { originalPost(message); if (message.type === 'stage' && message.stage === 'hashing') hashing.resolve(); };
    const first = h.handle({ type: 'hash', jobId: 1, file: fakeFile() });
    await hashing.promise;
    await h.handle({ type: 'hash', jobId: 2, file: fakeFile() });
    if (rejectDigest) digest.reject(new Error('FAKE_RAW_LATE_ERROR')); else digest.resolve(new ArrayBuffer(32));
    await first;
    assert.deepEqual(h.messages, [{ type: 'stage', jobId: 1, stage: 'reading' }, { type: 'stage', jobId: 1, stage: 'hashing' }, { type: 'error', jobId: 2, code: 'WORKER_PROTOCOL' }]);
    assert.equal(h.closeCount, 1);
  }
});

test('postMessage failure closes safely without raw exceptions or starting a read', async () => {
  let reads = 0;
  class CountedFile extends File { arrayBuffer() { reads += 1; return super.arrayBuffer(); } }
  const h = harness({ postMessage() { throw new Error('FAKE_RAW_POST_FAILURE'); } });
  await assert.doesNotReject(h.handle({ type: 'hash', jobId: 1, file: new CountedFile(['abc'], 'FAKE_TEST_NAME.bin') }));
  assert.equal(reads, 0); assert.equal(h.closeCount, 1); assert.deepEqual(h.messages, []);
});

async function sourceFixture(t, full = false) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'glossquote-file-checksum-t01-'));
  const original = path.resolve(base);
  t.after(async () => {
    assert.equal(path.resolve(base), original);
    assert.equal(path.dirname(base), path.resolve(os.tmpdir()));
    assert.ok(path.basename(base).startsWith('glossquote-file-checksum-t01-'));
    assert.equal((await fs.lstat(base)).isSymbolicLink(), false);
    assert.equal(path.resolve(await fs.realpath(base)), original);
    await fs.rm(base, { recursive: true, force: false });
  });
  const root = path.join(base, 'project');
  const files = full ? ['package.json', 'scripts/build.mjs', 'scripts/check.mjs', 'scripts/serve.mjs', 'scripts/validation.mjs', 'scripts/build-worker.mjs', 'test/scaffold.test.mjs', 'test/checksum.test.mjs', 'test/session.test.mjs', 'test/worker.test.mjs', 'test/ui-contract.test.mjs', ...APPROVED_ASSETS.map(name => `public/${name}`)] : ['public/js/hash.worker.mjs', 'public/js/worker-source.mjs'];
  for (const name of files) { const target = path.join(root, name); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, await fs.readFile(path.join(ROOT, name)), { flag: 'wx' }); }
  return { base, root };
}

test('worker-source export roundtrips every original byte and is the canonical generated file', async () => {
  const bytes = await fs.readFile(path.join(ROOT, 'public/js/hash.worker.mjs'));
  assert.deepEqual(Buffer.from(WORKER_SOURCE, 'utf8'), bytes);
  assert.deepEqual(await fs.readFile(path.join(ROOT, 'public/js/worker-source.mjs')), renderWorkerSource(bytes));
  const result = await verifyWorkerSource();
  assert.equal(result.bytes, bytes.length);
  assert.equal(result.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.doesNotMatch(WORKER_SOURCE, /\bimport\b|\bfetch\b|\beval\s*\(|\bconsole\b|\bnew\s+Function\b/);
});

test('generation preserves CRLF/BOM Unicode bytes; invalid UTF-8 refuses', () => {
  for (const bytes of [Buffer.from('\ufeff// 合成\r\nexport const fake = "😀";\r\n', 'utf8'), Buffer.from('// fake\n', 'utf8')]) {
    const generated = renderWorkerSource(bytes).toString('utf8');
    const match = generated.match(/^export const WORKER_SOURCE = (.*);\n$/);
    assert.ok(match);
    assert.deepEqual(Buffer.from(JSON.parse(match[1]), 'utf8'), bytes);
  }
  assert.throws(() => renderWorkerSource(Buffer.from([0xff, 0xfe])), validationCode('WORKER_UTF8_INVALID'));
});

test('tampered source/bundle refuses check and build without changing existing dist', async t => {
  for (const file of ['hash.worker.mjs', 'worker-source.mjs']) await t.test(file, async child => {
    const f = await sourceFixture(child, true);
    await buildPreview(f.root);
    const before = await Promise.all(APPROVED_ASSETS.map(name => fs.readFile(path.join(f.root, 'dist', name))));
    await fs.appendFile(path.join(f.root, 'public/js', file), '\n// FAKE_TAMPER\n');
    await assert.rejects(verifyWorkerSource(f.root), validationCode('WORKER_SOURCE_STALE'));
    await assert.rejects(validateProject(f.root), validationCode('WORKER_SOURCE_STALE'));
    await assert.rejects(buildPreview(f.root), validationCode('WORKER_SOURCE_STALE'));
    const after = await Promise.all(APPROVED_ASSETS.map(name => fs.readFile(path.join(f.root, 'dist', name))));
    assert.deepEqual(after, before);
  });
});

test('explicit generation refreshes a stale file; hardlinked destination never alters sentinel', async t => {
  const f = await sourceFixture(t);
  await fs.appendFile(path.join(f.root, 'public/js/hash.worker.mjs'), '\n// FAKE_SOURCE_UPDATE\n');
  await assert.rejects(verifyWorkerSource(f.root), validationCode('WORKER_SOURCE_STALE'));
  await generateWorkerSource(f.root);
  await assert.doesNotReject(verifyWorkerSource(f.root));
  const destination = path.join(f.root, 'public/js/worker-source.mjs');
  const sentinel = path.join(f.base, 'external-fake-sentinel.mjs');
  const bytes = Buffer.from('FAKE_EXTERNAL_GENERATOR_SENTINEL\n');
  await fs.writeFile(sentinel, bytes);
  await fs.unlink(destination); await fs.link(sentinel, destination);
  await assert.rejects(generateWorkerSource(f.root), validationCode('UNSAFE_DESTINATION'));
  assert.deepEqual(await fs.readFile(sentinel), bytes);
});
