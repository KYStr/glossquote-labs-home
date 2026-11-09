import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CASES, FIXTURE, classifyCase, classifyRun } from './evidence.mjs';
import { verifyFrozenInputs } from './bindings.mjs';
import { makeReaderExpression } from './first-party.mjs';
import { executeSixCases } from './protocol.mjs';
import { runAdapter } from './adapter.mjs';
import { cases, failNative, FakeCdp, ORIGIN, serverReceipt } from './offline-fixtures.mjs';

const fixed = await verifyFrozenInputs();
const { installNativeObserver } = await import(fixed.observerUrl);
const invalid = (row, code) => { const result = classifyCase(row); assert.notEqual(result.status, 'PASS'); assert(result.reasons.includes(code), JSON.stringify(result.reasons)); return result; };

test('six exact namespaces accept reused request IDs across fresh contexts without mutation', () => {
  const data = cases(), original = structuredClone(data), result = classifyRun(data);
  assert.equal(result.conclusion, 'HISTORY_NOT_REPRODUCED'); assert(result.cases.every(row => row.status === 'PASS'));
  assert(result.cases.every(row => row.request.nativeSessionId.startsWith('session-') && row.request.sourceSessionId === null));
  assert.deepEqual(data, original); assert.equal(result.fullNetworkAccepted, false); assert.equal(result.fullT02Accepted, false);
  assert.equal(result.historicalFailedRetained, 69); assert.equal(result.historicalMissingTerminalsRetained, 3);
});

test('native failure remains FAIL with successful EOF/hash/server FINISH', () => {
  const data = cases(); data.filter(row => row.mode === 'A').forEach(failNative);
  const result = classifyRun(data); assert.equal(result.conclusion, 'CONSISTENT_SUBMISSION_STRATEGY_DIFFERENCE');
  assert.equal(result.cases.filter(row => row.status === 'FAIL').length, 3);
  assert(result.cases.filter(row => row.mode === 'A').every(row => row.nativeFailures[0].classification === 'FAIL_RETAINED'));
  assert(result.attribution.includes('not separately identified'));
});

test('missing native terminal is NOT_RUN and cannot be filled by server finish or hash', () => {
  for (const expired of [false, true]) {
    const row = cases()[0], start = row.native.events.find(e => e.method === 'Network.requestWillBeSent');
    row.control.terminalDeadlineExpired = expired;
    row.native.events = row.native.events.filter(e => e.method !== 'Network.loadingFinished');
    row.native.unfinishedRequests.push({ targetId: row.targetId, sessionId: null, requestId: start.requestId, classification: 'NOT_RUN_MISSING_NATIVE_TERMINAL' });
    const result = classifyCase(row); assert.equal(result.status, 'NOT_RUN'); assert.equal(result.evidenceStatus, 'NOT_RUN_NATIVE_REQUEST_TERMINAL'); assert.equal(result.missingTerminals.length, 1);
    assert.equal(result.reasons.includes('TERMINAL_DEADLINE_EXPIRED'), expired);
  }
  const observedAfterDeadline = cases()[0]; observedAfterDeadline.control.terminalDeadlineExpired = true;
  invalid(observedAfterDeadline, 'DEADLINE_EXPIRED_WITH_TERMINAL');
});

test('duplicate terminal, including finished plus failed, is invalid evidence', () => {
  for (const fail of [false, true]) { const row = cases()[0], end = { ...row.native.events.at(-1) }; if (fail) { end.method = 'Network.loadingFailed'; end.errorText = 'net::ERR_ABORTED'; } row.native.events.push(end); const result = invalid(row, 'DUPLICATE_NATIVE_TERMINAL'); if (fail) assert.equal(result.status, 'FAIL'); }
});

test('interleaved target IDs or session IDs never attach to a matching requestId', () => {
  const target = cases()[0]; target.native.events[2].targetId = 'target-B1'; invalid(target, 'INTERLEAVED_OR_UNKNOWN_NATIVE_NAMESPACE');
  const session = cases()[0]; session.native.events[2].sessionId = 'session-B1'; invalid(session, 'INTERLEAVED_OR_UNKNOWN_NATIVE_NAMESPACE');
  const proof = cases()[0]; proof.control.sessionIdFromAttach = 'session-B1'; invalid(proof, 'TARGET_SESSION_CONTEXT_BINDING');
});

test('same-namespace request ID reuse, missing start and unfinished contradiction are rejected', () => {
  const duplicate = cases()[0]; duplicate.native.events.splice(2, 0, { ...duplicate.native.events[1] }); invalid(duplicate, 'DUPLICATE_REQUEST_START');
  const missing = cases()[0]; missing.native.events.splice(1, 1); invalid(missing, 'EVENT_WITHOUT_EXACT_REQUEST_START');
  const ended = cases()[0]; ended.native.unfinishedRequests.push({ targetId: ended.targetId, sessionId: null, requestId: ended.native.events[1].requestId }); invalid(ended, 'UNFINISHED_NAMESPACE_OR_TERMINAL_CONTRADICTION');
});

test('capture gaps, unknown workers and cleanup/deadline failures cannot pass', () => {
  for (const change of [row => row.native.captureGaps.push({}), row => { row.native.fatal = { reasonCode: 'TEST' }; }, row => row.native.workers.push({ targetId: 'unknown' }), row => { row.capture.stoppedBeforeContextCleanup = false; }, row => { row.capture.nativeClosedAtMs = null; }, row => { row.capture.headerDropped = 1; }, row => { row.cleanup.contextDisposed = false; }, row => { row.control.terminalDeadlineExpired = true; }]) { const row = cases()[0]; change(row); assert.notEqual(classifyCase(row).status, 'PASS'); }
});

test('first-party EOF/hash/cap and numeric-only receipts are independent gates', () => {
  for (const change of [row => { row.firstParty.receivedBytes -= 1; }, row => { row.firstParty.sha256 = '0'.repeat(64); }, row => { row.firstParty.overflow = true; }, row => { row.firstParty.receipts[2].eof = 0; }, row => { row.firstParty.receipts[0].transcript = 'SYNTHETIC_PRIVATE_CANARY'; }]) { const row = cases()[0]; change(row); const result = classifyCase(row); assert.notEqual(result.status, 'PASS'); assert(!JSON.stringify(result).includes('SYNTHETIC_PRIVATE_CANARY')); }
});

test('server sequence, actual write strategy, ACK order and default context must agree', () => {
  for (const change of [row => { row.server.sequence = 2; }, row => { row.server.transportWriteCalls = 0; }, row => { row.control.networkReadyOrder = 4; }, row => { row.native.events[0].ackAtMs = 21; }, row => { row.control.documentCommit.frameId = 'other'; }]) { const row = cases()[0]; change(row); assert.notEqual(classifyCase(row).status, 'PASS'); }
});

test('Date alone may vary, while CSP/control drift invalidates the comparison', () => {
  const date = cases(); date[1].headers[0].headers.Date = 'Thu, 22 Oct 2026 00:00:01 GMT'; assert.equal(classifyRun(date).conclusion, 'HISTORY_NOT_REPRODUCED');
  const changed = cases(); changed[1].headers[0].headers['Content-Security-Policy'] += '; img-src self'; changed[1].server.responseHeaders['Content-Security-Policy'] += '; img-src self';
  assert.equal(classifyCase(changed[1]).status, 'PASS'); assert(classifyRun(changed).reasons.includes('CONTROLLED_COMPARISON_MISMATCH'));
});

test('origin/base-document mismatch and out-of-scope model requests are rejected', () => {
  const wrong = cases()[0]; wrong.native.origin = 'http://127.0.0.1:5292'; invalid(wrong, 'ORIGIN_OR_BASE_DOCUMENT_MISMATCH');
  const mixed = cases(); mixed[1].native.origin = 'http://127.0.0.1:5292'; mixed[1].control.navigation.url = mixed[1].control.documentCommit.url = mixed[1].native.origin + '/model-manifest.json';
  assert(classifyRun(mixed).reasons.includes('CONTROLLED_COMPARISON_MISMATCH'));
  const model = cases()[0]; model.native.events[1].url = '/models/unexpected.onnx'; invalid(model, 'UNEXPECTED_PAGE_REQUEST');
});

test('six fake CDP cases use the unchanged observer, fresh IDs and exact cleanup only', async () => {
  const client = new FakeCdp(), saved = new Map();
  const result = await executeSixCases({ client, transport: { setMode() {}, receipt: async index => serverReceipt(index - 1) }, origin: ORIGIN, readerSource: fixed.readerSource, installObserver: installNativeObserver, checkBoundary: async () => ({ ok: true, evidence: ['offline-fake-boundary.json'] }), save: async (name, data) => saved.set(name, structuredClone(data)), executionKind: 'OFFLINE_FAKE_CDP' });
  assert.equal(result.executionKind, 'OFFLINE_FAKE_CDP'); assert.equal(result.conclusion, 'HISTORY_NOT_REPRODUCED'); assert(result.cases.every(row => row.status === 'PASS'));
  assert.equal(client.commands.filter(row => row.method === 'Target.createBrowserContext').length, 6);
  assert.equal(client.commands.filter(row => row.method === 'Target.disposeBrowserContext').length, 6);
  assert.equal(client.commands.filter(row => row.method === 'Target.detachFromTarget').length, 6);
  assert.equal(client.commands.filter(row => row.method === 'Target.closeTarget').length, 6);
  assert.equal(client.liveContexts.size, 0); assert.equal(client.targets.size, 0); assert.equal(client.nativeAttachments.size, 0);
  assert(!client.commands.some(row => ['Browser.close', 'Target.getTargets', 'Network.getResponseBody'].includes(row.method)));
  for (const sessionId of new Set(client.commands.filter(row => row.sessionId).map(row => row.sessionId))) {
    const commands = client.commands.filter(row => row.sessionId === sessionId);
    assert(commands.findIndex(row => row.method === 'Network.enable') < commands.findIndex(row => row.method === 'Page.navigate'));
    const runtime = commands.find(row => row.method === 'Runtime.evaluate' && row.params.awaitPromise);
    assert.equal(runtime.params.timeout, 10000); assert.equal(runtime.params.contextId, 1);
    assert.equal(runtime.params.expression.split(fixed.readerSource).length, 2);
  }
  for (const expected of CASES) { assert.equal(saved.get('cases/' + expected.id + '/native-network.json').status, 'CLOSED'); assert(saved.has('cases/' + expected.id + '/server-receipt.json')); }
});

test('late context, target and attach ACKs are drained and their exact resources cleaned', async () => {
  for (const method of ['Target.createBrowserContext', 'Target.createTarget', 'Target.attachToTarget']) {
    const client = new FakeCdp({ lateMethod: method, replyDelayMs: 20 }), saved = new Map();
    const result = await executeSixCases({ client, transport: { setMode() {}, receipt: async index => serverReceipt(index - 1) }, origin: ORIGIN, readerSource: fixed.readerSource, installObserver: installNativeObserver, checkBoundary: async () => ({ ok: true, evidence: ['offline-fake-boundary.json'] }), save: async (name, data) => saved.set(name, structuredClone(data)), executionKind: 'OFFLINE_FAKE_CDP', offlineCommandMs: 5 });
    assert.equal(result.fatal, 'CDP_COMMAND_DEADLINE'); assert(result.cases.every(row => row.status === 'NOT_RUN'));
    const control = saved.get('cases/A1/control.json'), entry = control.resourceCommands.find(row => row.method === method);
    assert.equal(entry.visibleDeadlineExpired, true); assert.equal(entry.state, 'ACK_OWNED'); assert.equal(entry.ownershipUnknown, false);
    assert.equal(control.cleanup.resourcesDrained, true); assert.equal(control.cleanup.contextDisposed, true); assert.deepEqual(control.cleanup.errors, []);
    const disposed = client.commands.find(row => row.method === 'Target.disposeBrowserContext'); assert(disposed.atMs >= entry.settledAtMs);
    assert.equal(client.commands.filter(row => row.method === 'Target.createBrowserContext').length, 1);
    if (method !== 'Target.createBrowserContext') { assert.equal(control.cleanup.targetClosed, true); assert(client.commands.find(row => row.method === 'Target.closeTarget').atMs >= entry.settledAtMs); }
    if (method === 'Target.attachToTarget') { assert.equal(control.cleanup.sessionDetached, true); assert(client.commands.find(row => row.method === 'Target.detachFromTarget').atMs >= entry.settledAtMs); }
    assert.equal(client.liveContexts.size, 0); assert.equal(client.targets.size, 0); assert.equal(client.nativeAttachments.size, 0);
    assert(!client.commands.some(row => ['Browser.close', 'Target.getTargets'].includes(row.method)));
  }
});

test('fake native failures are retained without being claimed as real browser execution', async () => {
  const result = await executeSixCases({ client: new FakeCdp({ aFails: true }), transport: { setMode() {}, receipt: async index => serverReceipt(index - 1) }, origin: ORIGIN, readerSource: fixed.readerSource, installObserver: installNativeObserver, checkBoundary: async () => ({ ok: true, evidence: ['offline-fake-boundary.json'] }), save: async () => {}, executionKind: 'OFFLINE_FAKE_CDP' });
  assert.equal(result.conclusion, 'CONSISTENT_SUBMISSION_STRATEGY_DIFFERENCE'); assert.equal(result.failures.length, 3); assert.equal(result.executionKind, 'OFFLINE_FAKE_CDP');
});

test('Network.enable ACK is actually awaited before any navigation', async () => {
  let reached, release; const observed = new Promise(resolve => { reached = resolve; }), ack = new Promise(resolve => { release = resolve; });
  const client = new FakeCdp({ holdNetwork: () => { reached(); return ack; } });
  const run = executeSixCases({ client, transport: { setMode() {}, receipt: async index => serverReceipt(index - 1) }, origin: ORIGIN, readerSource: fixed.readerSource, installObserver: installNativeObserver, checkBoundary: async () => ({ ok: true, evidence: ['offline-fake-boundary.json'] }), save: async () => {}, executionKind: 'OFFLINE_FAKE_CDP' });
  await observed; assert(!client.commands.some(row => row.method === 'Page.navigate')); release();
  assert.equal((await run).fatal, null);
});

test('missing primary guard or wrong pipe timeout stops before CDP and resources', async () => {
  const client = new FakeCdp();
  await assert.rejects(runAdapter({ client, ownedRunDirectory: '/unused' }), /PRIMARY_OWNED_CAPABILITIES_REQUIRED/u);
  await assert.rejects(runAdapter({ client, checkBoundary: async () => ({ ok: true, evidence: ['offline-fake-boundary.json'] }), ownedRunDirectory: '/unused' }), /REAL_DIRECT_CDP_PIPE_REQUIRED/u);
  await assert.rejects(executeSixCases({ client, transport: {}, origin: ORIGIN, readerSource: fixed.readerSource, installObserver: installNativeObserver, checkBoundary: async () => false, save: async () => {}, executionKind: 'OFFLINE_FAKE_CDP' }), /PRIMARY_GUARD_RECEIPT_REQUIRED/u);
  assert.equal(client.commands.length, 0); client.commandTimeoutMs = 3000;
  await assert.rejects(executeSixCases({ client, installObserver: installNativeObserver, checkBoundary() {}, save() {} }), /DIRECT_CDP_CLIENT_WITH_10000MS_TIMEOUT_REQUIRED/u);
});

test('reader expression uses exact fixed bytes with no fetch wrapper or success cleanup', async () => {
  const expression = makeReaderExpression(fixed.readerSource);
  assert.equal(expression.expression.split(fixed.readerSource).length, 2);
  assert(expression.expression.includes("credentials: 'omit', redirect: 'error', cache: 'no-store'"));
  assert(!/globalThis\.fetch|releaseLock\s*\(|setTimeout\s*\(/u.test(expression.expression));
  assert.throws(() => makeReaderExpression(fixed.readerSource + '\n'), /READER_SOURCE_MISMATCH/u);
  const adapter = await readFile(new URL('./adapter.mjs', import.meta.url), 'utf8');
  assert(!/child_process|\.kill\(|Browser\.close|\.launch\(/u.test(adapter.replace(/\/\*[^]*?\*\//gu, '').replace(/\/\/[^\n]*/gu, '')));
  assert.equal(FIXTURE.bytes, 160044);
});
