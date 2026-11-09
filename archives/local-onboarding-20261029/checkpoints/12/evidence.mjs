export const FIXTURE = Object.freeze({ path: '/fixtures/generated/t02-v1/en-04.wav', bytes: 160044, sha256: '1255b2a08c579ce8967b81d290b0a26daafd1f8acfe7eaf736eae13f2f46bf66', readerSha256: '09cd2e5c00ec4e31657fc0d618de7fcd1702aace044785c4736189e8cbc42716' });
export const CASES = Object.freeze([1, 2, 3].flatMap(pair => ['A', 'B'].map(mode => Object.freeze({ id: mode + pair, pair, mode }))));
export const ALLOWED_PATHS = Object.freeze(['/model-manifest.json', '/js/core/memory-phases.mjs', '/favicon.ico', FIXTURE.path]);
export const LIMITS = Object.freeze({ runtimeMs: 10000, terminalMs: 5000, commandMs: 3000, firstPartyEvents: 128, headerEvents: 128, headerBytes: 65536, fileBytes: 5 * 1024 * 1024 });
export const isId = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && !/[\x00-\x1f\x7f]/u.test(value);
export const requireValue = (condition, code) => { if (!condition) throw Object.assign(new Error(code), { code }); };
export const errorCode = (error, fallback) => typeof error?.code === 'string' && /^[A-Z0-9_]{1,64}$/u.test(error.code) ? error.code : fallback;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const key = event => JSON.stringify([event.targetId, event.sessionId ?? null, event.requestId]);
const terminals = new Set(['Network.loadingFinished', 'Network.loadingFailed']);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function normalizeHeaders(headers) {
  requireValue(headers && typeof headers === 'object' && !Array.isArray(headers), 'HEADER_SCHEMA');
  const allowed = new Set(['content-security-policy', 'x-content-type-options', 'referrer-policy', 'x-frame-options', 'x-robots-tag', 'permissions-policy', 'cache-control', 'content-type', 'content-length', 'date', 'connection', 'keep-alive', 'content-encoding', 'transfer-encoding']);
  const out = {};
  requireValue(Object.keys(headers).length <= allowed.size, 'HEADER_COUNT');
  for (const [name, raw] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    requireValue(allowed.has(lower) && !Object.hasOwn(out, lower), 'UNKNOWN_OR_DUPLICATE_HEADER');
    requireValue((typeof raw === 'string' || (typeof raw === 'number' && Number.isFinite(raw))) && String(raw).length <= 2048 && !/[\x00-\x1f\x7f]/u.test(String(raw)), 'HEADER_VALUE');
    out[lower] = String(raw);
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}

export function safeFirstParty(value) {
  const fields = new Set(['outcome', 'receivedBytes', 'sha256', 'code', 'receipts', 'overflow', 'readerSha256']);
  const numbers = new Set(['jobId', 'sequence', 'wallTimeMs', 'monotonicMs', 'scopeCode', 'ordinal', 'readId', 'expectedBytes', 'receivedBytes', 'eof', 'hashChecked', 'hashOk', 'readerLocked', 'lockObserved', 'hasSignal', 'signalAborted', 'reasonCode', 'outcomeCode', 'eventCode']);
  requireValue(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => fields.has(key)) && ['SUCCESS', 'ERROR'].includes(value.outcome) && Array.isArray(value.receipts) && value.receipts.length <= LIMITS.firstPartyEvents, 'FIRST_PARTY_RESULT_SCHEMA');
  requireValue(typeof value.overflow === 'boolean' && value.readerSha256 === FIXTURE.readerSha256 && (value.receivedBytes === undefined || Number.isSafeInteger(value.receivedBytes) && value.receivedBytes >= 0 && value.receivedBytes <= FIXTURE.bytes) && (value.sha256 === undefined || typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/u.test(value.sha256)) && (value.code === undefined || ['FIXTURE_OR_MANIFEST_UNAVAILABLE', 'FIXTURE_OR_MANIFEST_TOO_LARGE', 'FIRST_PARTY_READ_FAILED'].includes(value.code)), 'FIRST_PARTY_RESULT_VALUES');
  for (const row of value.receipts) requireValue(row && typeof row === 'object' && Object.entries(row).every(([key, number]) => key === 'phase' ? number === 'read-receipt' : numbers.has(key) && typeof number === 'number' && Number.isFinite(number) && number >= 0), 'FIRST_PARTY_NUMERIC_RECEIPT_SCHEMA');
  return structuredClone(value);
}

function firstPartyValid(value) {
  safeFirstParty(value);
  requireValue(value?.outcome === 'SUCCESS' && value.receivedBytes === FIXTURE.bytes && value.sha256 === FIXTURE.sha256 && value.readerSha256 === FIXTURE.readerSha256 && value.overflow === false, 'FIRST_PARTY_READ_OR_HASH');
  const rows = value.receipts;
  requireValue(Array.isArray(rows) && rows.length === 5, 'FIRST_PARTY_RECEIPT_COUNT');
  requireValue(equal(rows.map(row => row.eventCode), [1, 2, 3, 8, 4]), 'FIRST_PARTY_EOF_FINISH_HASH_ORDER');
  for (const [index, row] of rows.entries()) {
    requireValue(row.phase === 'read-receipt' && row.jobId === 0 && row.sequence === index && row.scopeCode === 2 && row.ordinal === 1 && row.readId === 1 && row.expectedBytes === FIXTURE.bytes && row.hasSignal === 0 && row.signalAborted === 0 && finite(row.wallTimeMs) && finite(row.monotonicMs), 'FIRST_PARTY_RECEIPT_IDENTITY');
    requireValue(index === 0 || row.monotonicMs >= rows[index - 1].monotonicMs, 'FIRST_PARTY_RECEIPT_TIME');
    requireValue(Number.isInteger(row.receivedBytes) && row.receivedBytes >= 0 && row.receivedBytes <= FIXTURE.bytes && [0, 1].includes(row.eof) && [0, 1].includes(row.hashChecked) && [0, 1].includes(row.hashOk) && row.reasonCode === 0, 'FIRST_PARTY_RECEIPT_VALUES');
  }
  requireValue(rows[2].eof === 1 && rows[2].receivedBytes === FIXTURE.bytes && rows[3].outcomeCode === 1 && rows[3].receivedBytes === FIXTURE.bytes && rows[4].hashChecked === 1 && rows[4].hashOk === 1, 'FIRST_PARTY_EOF_FINISH_HASH');
  // Validate the fixed successful reader's complete state transitions, not only a few terminal flags.
  for (const [index, row] of rows.entries()) {
    const expected = { receivedBytes: index >= 2 ? FIXTURE.bytes : 0, eof: Number(index >= 2),
      hashChecked: Number(index === 4), hashOk: Number(index === 4), readerLocked: Number(index > 0),
      lockObserved: Number(index > 0), outcomeCode: index >= 3 ? 1 : 0 };
    requireValue(Object.entries(expected).every(([name, value]) => row[name] === value), 'FIRST_PARTY_STATE_TRANSITION_MISMATCH');
  }
}

export function classifyCase(input) {
  const result = { id: input?.id, mode: input?.mode, pair: input?.pair, status: 'NOT_RUN', evidenceStatus: 'INVALID_EVIDENCE', nativeOutcome: 'UNOBSERVED', reasons: [], nativeFailures: [], missingTerminals: [], fullNetworkAccepted: false, fullT02Accepted: false };
  if (typeof input?.notRunReason === 'string' && /^[A-Z0-9_]{1,64}$/u.test(input.notRunReason)) result.reasons.push(input.notRunReason);
  const snapshot = input?.native;
  // Preserve every native failure, including auxiliaries and invalid namespaces.
  result.nativeFailures = (Array.isArray(snapshot?.events) ? snapshot.events : []).filter(e => e?.method === 'Network.loadingFailed').map(e => ({ targetId: e.targetId, sourceSessionId: e.sessionId ?? null, nativeSessionId: e.sessionId == null && e.targetId === input.targetId ? input.sessionId : e.sessionId, requestId: e.requestId, errorText: /^net::ERR_[A-Z0-9_]{1,80}$/u.test(e.errorText ?? '') ? e.errorText : '[redacted]', canceled: typeof e.canceled === 'boolean' ? e.canceled : null, classification: 'FAIL_RETAINED' }));
  try {
    requireValue(!input.notRunReason, 'CASE_INTERRUPTED');
    const expected = CASES.find(row => row.id === input.id);
    requireValue(expected && input.mode === expected.mode && input.pair === expected.pair, 'CASE_IDENTITY');
    requireValue([input.contextId, input.targetId, input.sessionId].every(isId), 'CASE_NATIVE_IDS');
    requireValue(input.control?.targetInfo?.targetId === input.targetId && input.control.targetInfo.browserContextId === input.contextId && input.control.targetInfo.type === 'page' && input.control.sessionIdFromAttach === input.sessionId, 'TARGET_SESSION_CONTEXT_BINDING');
    requireValue(snapshot?.rootTargetId === input.targetId && Array.isArray(snapshot.events) && snapshot.status === 'CLOSED' && snapshot.fatal === null && snapshot.fatalCallbackError === false && snapshot.captureGaps?.length === 0 && snapshot.cleanupFailures?.length === 0 && snapshot.workers?.length === 0, 'CAPTURE_INCOMPLETE_OR_UNKNOWN_WORKER');
    // Reject coercible/non-integral ordering counters before relational comparisons. 驗證操作序號，避免字串或小數通過比較。
    requireValue(['networkReadyOrder', 'navigationSendOrder', 'runtimeSendOrder'].every(name => Number.isSafeInteger(input.control[name]) && input.control[name] > 0), 'CONTROL_ORDER_SCHEMA'); // 序號必須是正安全整數。
    requireValue(finite(input.control.navigationSentAtMs) && input.control.navigationSentAtMs >= 0, 'CONTROL_TIME_SCHEMA'); // 導航時間必須是有限非負數，不接受隱式型別轉換。
    const enabled = snapshot.events.filter(e => e.kind === 'observer' && e.action === 'page-network-enabled');
    requireValue(enabled.length === 1 && enabled[0].targetId === input.targetId && finite(enabled[0].ackAtMs) && enabled[0].ackAtMs <= input.control.navigationSentAtMs && input.control.networkReadyOrder < input.control.navigationSendOrder && input.control.navigationSendOrder < input.control.runtimeSendOrder, 'NETWORK_ENABLE_NOT_BEFORE_NAVIGATION');
    requireValue(input.capture?.stoppedBeforeContextCleanup === true && input.capture.headerFatal === null && input.capture.headerDropped === 0 && finite(input.capture.nativeClosedAtMs) && finite(input.cleanup?.startedAtMs) && input.capture.nativeClosedAtMs <= input.cleanup.startedAtMs && input.cleanup.resourcesDrained === true && input.cleanup.sessionDetached === true && input.cleanup.targetClosed === true && input.cleanup.contextDisposed === true && input.cleanup.errors?.length === 0, 'CAPTURE_OR_CONTEXT_CLEANUP');
    requireValue(input.control.runtimeDeadlineMs === LIMITS.runtimeMs && input.control.terminalDeadlineMs === LIMITS.terminalMs && typeof input.control.runtimeDeadlineExpired === 'boolean' && typeof input.control.terminalDeadlineExpired === 'boolean' && input.control.prohibitedEvents?.length === 0, 'DEADLINE_OR_PROHIBITED_EVENT');
    requireValue(input.control.documentCommit?.frameId === input.control.navigation?.frameId && input.control.documentCommit.url === input.control.navigation.url && Number.isSafeInteger(input.control.documentCommit.executionContextId), 'DOCUMENT_COMMIT_NOT_BOUND');
    const baseDocument = new URL(input.control.navigation.url);
    requireValue(baseDocument.protocol === 'http:' && baseDocument.hostname === '127.0.0.1' && baseDocument.port && baseDocument.origin === snapshot.origin && baseDocument.pathname === '/model-manifest.json' && !baseDocument.search && !baseDocument.hash && !baseDocument.username && !baseDocument.password, 'ORIGIN_OR_BASE_DOCUMENT_MISMATCH');
    const events = snapshot.events.filter(e => e.kind === 'network');
    const starts = new Map(), responses = new Map(), ends = new Map(), data = new Map();
    for (const [index, event] of events.entries()) {
      requireValue(event.targetId === input.targetId && event.sessionId === null && isId(event.requestId), 'INTERLEAVED_OR_UNKNOWN_NATIVE_NAMESPACE');
      const k = key(event);
      if (event.method === 'Network.requestWillBeSent') {
        requireValue(ALLOWED_PATHS.includes(event.url) && event.requestMethod === 'GET', 'UNEXPECTED_PAGE_REQUEST');
        requireValue(!starts.has(k), 'DUPLICATE_REQUEST_START'); starts.set(k, { ...event, index });
      } else {
        requireValue(starts.has(k), 'EVENT_WITHOUT_EXACT_REQUEST_START');
        if (event.method === 'Network.responseReceived') { requireValue(!responses.has(k), 'DUPLICATE_RESPONSE'); responses.set(k, { ...event, index }); }
        else if (terminals.has(event.method)) { requireValue(!ends.has(k), 'DUPLICATE_NATIVE_TERMINAL'); ends.set(k, { ...event, index }); }
        else if (event.method === 'Network.dataReceived') {
          requireValue(responses.has(k) && !ends.has(k) && Number.isSafeInteger(event.dataLength) && event.dataLength >= 0, 'DATA_EVENT_ORDER_OR_SIZE');
          data.set(k, (data.get(k) ?? 0) + event.dataLength);
        } else requireValue(false, 'UNKNOWN_NATIVE_NETWORK_METHOD');
      }
    }
    for (const [k, start] of starts) if (!ends.has(k)) result.missingTerminals.push({ targetId: start.targetId, sourceSessionId: null, nativeSessionId: input.sessionId, requestId: start.requestId, classification: 'NOT_RUN_NATIVE_REQUEST_TERMINAL' });
    requireValue(Array.isArray(snapshot.unfinishedRequests), 'UNFINISHED_SCHEMA');
    for (const unfinished of snapshot.unfinishedRequests) {
      requireValue(unfinished.targetId === input.targetId && unfinished.sessionId === null && starts.has(key(unfinished)) && !ends.has(key(unfinished)), 'UNFINISHED_NAMESPACE_OR_TERMINAL_CONTRADICTION');
      requireValue(result.missingTerminals.some(row => row.requestId === unfinished.requestId), 'UNFINISHED_NOT_MATCHED');
    }
    requireValue(snapshot.unfinishedRequests.length === result.missingTerminals.length, 'MISSING_TERMINAL_INVENTORY_MISMATCH');
    const fixtureStarts = [...starts.values()].filter(e => e.url === FIXTURE.path);
    requireValue(fixtureStarts.length === 1, 'FIXTURE_REQUEST_NOT_UNIQUE');
    const start = fixtureStarts[0], k = key(start), response = responses.get(k), end = ends.get(k);
    result.request = { contextId: input.contextId, targetId: input.targetId, nativeSessionId: input.sessionId, sourceSessionId: null, requestId: start.requestId, collectorConvention: 'NULL_ROOT_SESSION_IS_EXACT_ATTACHED_PAGE_SESSION' };
    result.nativeOutcome = end?.method === 'Network.loadingFailed' ? 'loadingFailed' : end?.method === 'Network.loadingFinished' ? 'loadingFinished' : 'MISSING';
    if (result.missingTerminals.length) { result.evidenceStatus = 'NOT_RUN_NATIVE_REQUEST_TERMINAL'; result.reasons.push('MISSING_NATIVE_TERMINAL'); if (input.control.terminalDeadlineExpired) result.reasons.push('TERMINAL_DEADLINE_EXPIRED'); return finalizeCase(result); }
    requireValue(input.control.runtimeDeadlineExpired === false && input.control.terminalDeadlineExpired === false, 'DEADLINE_EXPIRED_WITH_TERMINAL');
    requireValue(start.requestMethod === 'GET' && start.resourceType === 'Fetch', 'FIXTURE_REQUEST_METHOD_OR_TYPE');
    requireValue(response?.response?.url === FIXTURE.path && response.response.status === 200 && start.index < response.index && response.index < end.index, 'FIXTURE_RESPONSE_OR_ORDER');
    requireValue(response.response.protocol === 'http/1.1' && response.response.fromDiskCache === false && response.response.fromServiceWorker === false && response.response.fromPrefetchCache === false, 'PROTOCOL_CACHE_OR_SERVICE_WORKER');
    const headerRows = input.headers?.filter(e => e.targetId === input.targetId && e.sessionId === input.sessionId && e.requestId === start.requestId);
    requireValue(headerRows?.length === 1 && headerRows[0].status === 200 && headerRows[0].path === FIXTURE.path, 'FULL_RESPONSE_HEADERS_NOT_EXACT');
    const headers = normalizeHeaders(headerRows[0].headers);
    requireValue(headers['content-length'] === String(FIXTURE.bytes) && headers['content-type'] === 'audio/wav' && headers['cache-control'] === 'no-store' && !headers['transfer-encoding'] && (!headers['content-encoding'] || headers['content-encoding'] === 'identity'), 'FIXTURE_HEADERS');
    // Compare overlapping fields from the independent observer with the full-header capture.
    const observedHeaders = normalizeHeaders(response.response.headers);
    requireValue(Object.hasOwn(observedHeaders, 'content-length') && Object.hasOwn(observedHeaders, 'cache-control'), 'NATIVE_HEADER_SNAPSHOT_INCOMPLETE');
    for (const [name, value] of Object.entries(observedHeaders)) requireValue(headers[name] === value, 'NATIVE_FULL_HEADER_MISMATCH');
    firstPartyValid(input.firstParty);
    requireValue(data.get(k) === FIXTURE.bytes, 'NATIVE_BODY_BYTES_MISMATCH');
    const server = input.server;
    requireValue(server?.sequence === CASES.indexOf(expected) + 1 && server.mode === input.mode && server.path === FIXTURE.path && server.originalHandlerDelegated === true && server.status === 200 && server.serverEvent === 'FINISH' && server.writableFinished === true && server.firstError === null && server.acceptedFixedFixture === true, 'SERVER_SEQUENCE_OR_FINISH');
    requireValue(['sourceWriteCalls', 'transportWriteCalls'].every(name => Number.isSafeInteger(server[name]) && server[name] >= 0), 'SERVER_WRITE_COUNTER_SCHEMA'); // 寫入次數必須是非負安全整數，後續仍驗證原策略關係。
    requireValue(server.sourceBytes === FIXTURE.bytes && server.sourceSha256 === FIXTURE.sha256 && server.submittedBytes === FIXTURE.bytes && server.sourceEndCalls === 1 && server.transportEndCalls === 1 && server.sourceWriteCalls >= 2, 'SERVER_SOURCE_BYTES_OR_WRITES');
    requireValue(input.mode === 'A' ? server.transportWriteCalls === server.sourceWriteCalls && server.transportBodyEndCalls === 0 && server.coalescedBytes === 0 : server.transportWriteCalls === 0 && server.transportBodyEndCalls === 1 && server.coalescedBytes === FIXTURE.bytes, 'TRANSPORT_VARIANT_NOT_OBSERVED');
    const serverHeaders = normalizeHeaders(server.responseHeaders);
    // These headers are always emitted by this fixed fixture server; omission is not evidence of agreement.
    const requiredServerHeaders = ['content-security-policy', 'x-content-type-options', 'referrer-policy',
      'x-frame-options', 'x-robots-tag', 'permissions-policy', 'cache-control', 'content-type', 'content-length'];
    requireValue(requiredServerHeaders.every(name => Object.hasOwn(serverHeaders, name)), 'SERVER_HEADER_SNAPSHOT_INCOMPLETE');
    for (const [name, value] of Object.entries(serverHeaders)) requireValue(headers[name] === value, 'SERVER_NATIVE_HEADER_MISMATCH');
    const comparisonHeaders = { ...headers }; delete comparisonHeaders.date;
    result.controls = { origin: snapshot.origin, protocol: response.response.protocol, fromDiskCache: false, fromServiceWorker: false, fromPrefetchCache: false, headers: comparisonHeaders, fixturePath: FIXTURE.path, bytes: FIXTURE.bytes, sha256: FIXTURE.sha256, readerSha256: FIXTURE.readerSha256 };
    result.evidenceStatus = 'VALID_THREE_WAY_OBSERVATION';
    result.status = result.nativeFailures.length ? 'FAIL' : 'PASS';
  } catch (error) { result.reasons.push(errorCode(error, 'INVALID_EVIDENCE_SCHEMA')); }
  return finalizeCase(result);
}

function finalizeCase(result) {
  if (result.nativeFailures.length) result.status = 'FAIL';
  return result;
}

export function classifyRun(inputs) {
  const rows = inputs.map(classifyCase), reasons = [];
  const identities = inputs.map(row => [row.contextId, row.targetId, row.sessionId]);
  if (!equal(inputs.map(row => row.id), CASES.map(row => row.id))) reasons.push('SIX_CASE_ORDER_REQUIRED');
  for (let field = 0; field < 3; field += 1) if (new Set(identities.map(row => row[field])).size !== 6) reasons.push('FRESH_CONTEXT_TARGET_SESSION_REQUIRED');
  const valid = rows.length === 6 && rows.every(row => row.evidenceStatus === 'VALID_THREE_WAY_OBSERVATION');
  if (valid && rows.some(row => !equal(row.controls, rows[0].controls))) reasons.push('CONTROLLED_COMPARISON_MISMATCH');
  if (rows.some(row => row.nativeFailures.some(failure => failure.requestId !== row.request?.requestId))) reasons.push('AUXILIARY_NATIVE_FAILURE_RETAINED');
  let conclusion = 'INVALID_OR_INCOMPLETE_COMPARISON';
  if (valid && !reasons.length) {
    const a = rows.filter(row => row.mode === 'A'), b = rows.filter(row => row.mode === 'B');
    if (a.every(row => row.nativeOutcome === 'loadingFailed') && b.every(row => row.nativeOutcome === 'loadingFinished')) conclusion = 'CONSISTENT_SUBMISSION_STRATEGY_DIFFERENCE';
    else if (rows.every(row => row.nativeOutcome === 'loadingFailed')) conclusion = 'BOTH_STRATEGIES_FAILED';
    else if (rows.every(row => row.nativeOutcome === 'loadingFinished')) conclusion = 'HISTORY_NOT_REPRODUCED';
    else conclusion = 'INCONCLUSIVE_MIXED_OR_REVERSED';
  }
  return { task: 'NEW22-12-CDP-ADAPTER', scope: 'SIX_CASE_PAGE_TRANSPORT_DIAGNOSTIC_ONLY', cases: rows, reasons, conclusion, attribution: 'Write count and buffering/submission timing are not separately identified.', historicalFailedRetained: 69, historicalMissingTerminalsRetained: 3, fullNetworkAccepted: false, fullT02Accepted: false, primaryIsolationAndRetirementAcceptanceRequired: true };
}
