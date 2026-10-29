import { CASES, FIXTURE, ALLOWED_PATHS, LIMITS, requireValue, isId, errorCode, normalizeHeaders, classifyRun, safeFirstParty } from './evidence.mjs';
import { makeReaderExpression } from './first-party.mjs';

export async function bounded(promise, ms, code) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error(code), { code })), ms); })]); }
  finally { clearTimeout(timer); }
}

function headerCapture(session, targetId, sessionId, origin, fail) {
  const state = { rows: [], bytes: 0, fatal: null, dropped: 0 };
  const listener = params => {
    try {
      requireValue(isId(params.requestId), 'HEADER_REQUEST_ID');
      const url = new URL(params.response.url);
      requireValue(url.origin === origin && !url.search && !url.hash && !url.username && !url.password, 'HEADER_RESPONSE_ORIGIN');
      const row = { targetId, sessionId, requestId: params.requestId, path: url.pathname, status: params.response.status, headers: normalizeHeaders(params.response.headers) };
      const bytes = Buffer.byteLength(JSON.stringify(row));
      requireValue(state.rows.length < LIMITS.headerEvents && state.bytes + bytes <= LIMITS.headerBytes, 'HEADER_CAPTURE_CAP');
      state.rows.push(row); state.bytes += bytes;
    } catch (error) { state.fatal ??= errorCode(error, 'HEADER_CAPTURE_SCHEMA'); state.dropped += 1; fail(state.fatal); }
  };
  const requestListener = params => {
    try {
      const url = new URL(params.request.url);
      requireValue(url.origin === origin && ALLOWED_PATHS.includes(url.pathname) && !url.search && !url.hash && !url.username && !url.password && params.request.method === 'GET', 'UNEXPECTED_PAGE_REQUEST');
    } catch (error) { state.fatal ??= errorCode(error, 'REQUEST_METADATA_SCHEMA'); state.dropped += 1; fail(state.fatal); }
  };
  session.on('Network.responseReceived', listener);
  session.on('Network.requestWillBeSent', requestListener);
  return { state, stop: () => { session.off('Network.responseReceived', listener); session.off('Network.requestWillBeSent', requestListener); } };
}

function terminalWait(session, observer, fatal) {
  const complete = () => {
    const snapshot = observer.snapshot();
    const rows = snapshot.events.filter(e => e.kind === 'network');
    const starts = rows.filter(e => e.method === 'Network.requestWillBeSent' && e.url === FIXTURE.path && e.sessionId === null);
    return starts.length === 1 && snapshot.unfinishedRequests.length === 0 && rows.some(e => ['Network.loadingFinished', 'Network.loadingFailed'].includes(e.method) && e.targetId === starts[0].targetId && e.sessionId === null && e.requestId === starts[0].requestId);
  };
  if (fatal()) return Promise.reject(Object.assign(new Error(fatal()), { code: fatal() }));
  if (complete()) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    const finish = timeout => { clearTimeout(timer); session.off('Network.loadingFinished', update); session.off('Network.loadingFailed', update); resolve(timeout); };
    const update = () => {
      if (fatal()) { clearTimeout(timer); session.off('Network.loadingFinished', update); session.off('Network.loadingFailed', update); reject(Object.assign(new Error(fatal()), { code: fatal() })); }
      else if (complete()) finish(false);
    };
    const timer = setTimeout(() => finish(true), LIMITS.terminalMs);
    session.on('Network.loadingFinished', update); session.on('Network.loadingFailed', update); update();
  });
}

function documentCommit(session, url) {
  let frame, ack, resolve; const contexts = [];
  const promise = new Promise(done => { resolve = done; });
  const check = () => {
    if (!ack || !frame || frame.id !== ack.frameId || frame.url !== url) return;
    const context = contexts.find(item => item.auxData?.isDefault === true && item.auxData.frameId === ack.frameId && item.origin === new URL(url).origin);
    if (context) resolve({ frameId: frame.id, loaderId: frame.loaderId ?? null, url, executionContextId: context.id, observedAtMs: performance.now() });
  };
  const onFrame = params => { if (!params.frame.parentId) frame = params.frame; check(); };
  const onContext = params => { if (contexts.length < 32) contexts.push(params.context); check(); };
  session.on('Page.frameNavigated', onFrame); session.on('Runtime.executionContextCreated', onContext);
  return { confirm: navigation => { ack = navigation; check(); return bounded(promise, LIMITS.commandMs, 'DOCUMENT_COMMIT_TIMEOUT'); }, stop: () => { session.off('Page.frameNavigated', onFrame); session.off('Runtime.executionContextCreated', onContext); } };
}

// Injected protocol operations only. Production adapter supplies the already
// owned direct-pipe client, unchanged observer and fixed source bindings.
export async function executeSixCases({ client, transport, origin, readerSource, installObserver, checkBoundary, save, executionKind, offlineCommandMs }) {
  requireValue(client && typeof client.session === 'function' && client.commandTimeoutMs === LIMITS.runtimeMs, 'DIRECT_CDP_CLIENT_WITH_10000MS_TIMEOUT_REQUIRED');
  requireValue(typeof installObserver === 'function' && typeof checkBoundary === 'function' && typeof save === 'function', 'PRIMARY_CAPABILITIES_REQUIRED');
  requireValue(['OFFLINE_FAKE_CDP', 'NATIVE_CDP_PENDING_PRIMARY_REVIEW'].includes(executionKind), 'EXECUTION_KIND_REQUIRED');
  requireValue(offlineCommandMs === undefined || executionKind === 'OFFLINE_FAKE_CDP' && Number.isInteger(offlineCommandMs) && offlineCommandMs >= 1 && offlineCommandMs <= LIMITS.commandMs, 'OFFLINE_DEADLINE_OVERRIDE_REJECTED');
  const commandMs = offlineCommandMs ?? LIMITS.commandMs;
  const base = new URL(origin);
  requireValue(base.origin === origin && base.protocol === 'http:' && base.hostname === '127.0.0.1' && Number(base.port) >= 1024 && !base.username && !base.password && !base.search && !base.hash, 'LOOPBACK_ORIGIN_REQUIRED');
  const root = client.session(), expression = makeReaderExpression(readerSource), inputs = [], guardRecords = [];
  const ownedContexts = new Set(), ownedTargets = new Set(), ownedSessions = new Set();
  let fatal = null, order = 0;
  const fail = code => { fatal ??= /^[A-Z0-9_]{1,64}$/u.test(code) ? code : 'CDP_CAPTURE_FAILED'; };
  const gate = async (stage, row) => {
    const receipt = await bounded(Promise.resolve().then(() => checkBoundary({ stage, id: row?.id ?? null, contextId: row?.contextId ?? null, targetId: row?.targetId ?? null, sessionId: row?.sessionId ?? null })), 30000, 'PRIMARY_GUARD_TIMEOUT');
    requireValue(receipt?.ok === true && Array.isArray(receipt.evidence) && receipt.evidence.length > 0 && receipt.evidence.length <= 8 && receipt.evidence.every(ref => typeof ref === 'string' && /^[A-Za-z0-9_./-]{1,240}$/u.test(ref) && !ref.startsWith('/') && !ref.split('/').includes('..')), 'PRIMARY_GUARD_RECEIPT_REQUIRED');
    guardRecords.push({ stage, id: row?.id ?? null, evidence: [...receipt.evidence], atMs: performance.now() });
  };
  const send = (session, method, params = {}, ms = commandMs) => bounded(session.send(method, params), ms, 'CDP_COMMAND_DEADLINE');
  await gate('before-six-cases');
  const version = await send(root, 'Browser.getVersion');
  requireValue(typeof version.product === 'string' && /^Chrome\/\d+(?:\.\d+){3}$/u.test(version.product), 'CHROME_VERSION_REQUIRED');
  for (const expected of CASES) {
    if (fatal) { inputs.push({ ...expected, notRunReason: fatal }); continue; }
    const row = { ...expected, control: { runtimeDeadlineMs: LIMITS.runtimeMs, terminalDeadlineMs: LIMITS.terminalMs, runtimeDeadlineExpired: false, terminalDeadlineExpired: false, prohibitedEvents: [] }, cleanup: { startedAtMs: null, resourcesDrained: false, contextDisposed: false, targetClosed: false, sessionDetached: false, errors: [] } };
    const resourceLedger = [];
    const resource = async (kind, method, params, own) => {
      const entry = { kind, method, issuedAtMs: performance.now(), settledAtMs: null, state: 'PENDING', visibleDeadlineExpired: false, ownershipUnknown: true, resourceId: null, code: null };
      const pending = Promise.resolve().then(() => root.send(method, params)).then(value => {
        entry.settledAtMs = performance.now();
        const returnedId = value?.browserContextId ?? value?.targetId ?? value?.sessionId;
        entry.resourceId = isId(returnedId) ? returnedId : null;
        try { own(value); entry.state = 'ACK_OWNED'; entry.ownershipUnknown = false; }
        catch (error) { entry.state = 'ACK_NOT_OWNED'; entry.code = errorCode(error, 'RESOURCE_OWNERSHIP_INVALID'); throw error; }
        return value;
      }, error => { entry.settledAtMs = performance.now(); entry.state = 'COMMAND_REJECTED_OR_TIMEOUT'; entry.code = errorCode(error, 'RESOURCE_COMMAND_FAILED'); throw error; });
      // Keep the underlying 10s command alive and observed after the visible 3s
      // deadline. Cleanup drains this ledger before deciding which exact IDs exist.
      pending.catch(() => {});
      resourceLedger.push({ entry, pending });
      try { return await bounded(pending, commandMs, 'CDP_COMMAND_DEADLINE'); }
      catch (error) { if (error?.code === 'CDP_COMMAND_DEADLINE') entry.visibleDeadlineExpired = true; throw error; }
    };
    let session, observer, header, phase = 'setup';
    const prohibited = name => { row.control.prohibitedEvents.push(name); fail('PROHIBITED_PAGE_EVENT'); };
    const onDialog = () => prohibited('javascript-dialog'), onFile = () => prohibited('file-chooser');
    try {
      await gate('before-case', row); transport.setMode(expected.mode);
      await resource('context', 'Target.createBrowserContext', { disposeOnDetach: true }, context => {
        requireValue(isId(context.browserContextId) && !ownedContexts.has(context.browserContextId), 'CONTEXT_NOT_FRESH');
        row.contextId = context.browserContextId; ownedContexts.add(row.contextId);
      });
      await send(root, 'Browser.setDownloadBehavior', { behavior: 'deny', browserContextId: row.contextId });
      for (const name of ['clipboard-read', 'clipboard-write']) await send(root, 'Browser.setPermission', { permission: { name }, setting: 'denied', origin, browserContextId: row.contextId });
      await resource('target', 'Target.createTarget', { url: 'about:blank', browserContextId: row.contextId, background: true }, target => {
        requireValue(isId(target.targetId) && !ownedTargets.has(target.targetId), 'TARGET_NOT_FRESH');
        row.targetId = target.targetId; ownedTargets.add(row.targetId);
      });
      await resource('session', 'Target.attachToTarget', { targetId: row.targetId, flatten: true }, attached => {
        requireValue(isId(attached.sessionId) && !ownedSessions.has(attached.sessionId), 'SESSION_NOT_FRESH');
        row.sessionId = attached.sessionId; ownedSessions.add(row.sessionId); row.control.sessionIdFromAttach = row.sessionId;
      });
      session = client.session(row.sessionId);
      requireValue(session.sessionId === row.sessionId, 'SESSION_FACADE_MISMATCH');
      const info = await send(session, 'Target.getTargetInfo');
      requireValue(info.targetInfo?.targetId === row.targetId && info.targetInfo.browserContextId === row.contextId && info.targetInfo.type === 'page' && info.targetInfo.url === 'about:blank', 'TARGET_INFO_MISMATCH');
      row.control.targetInfo = { targetId: info.targetInfo.targetId, browserContextId: info.targetInfo.browserContextId, type: info.targetInfo.type, url: info.targetInfo.url };
      session.on('Page.javascriptDialogOpening', onDialog); session.on('Page.fileChooserOpened', onFile);
      await send(session, 'Page.enable'); await send(session, 'Runtime.enable'); await gate('page-created', row);
      header = headerCapture(session, row.targetId, row.sessionId, origin, fail);
      // Fixed defaults of the unchanged collector, not a rewritten Network API.
      observer = await installObserver({ session, origin, onFatal: value => fail(value.reasonCode ?? 'NATIVE_OBSERVER_FATAL') });
      const enabled = observer.snapshot().events.filter(e => e.action === 'page-network-enabled');
      requireValue(enabled.length === 1 && enabled[0].targetId === row.targetId, 'NATIVE_NETWORK_ACK_MISSING');
      row.control.networkReadyOrder = ++order; row.control.networkAckAtMs = enabled[0].ackAtMs;
      row.control.navigationSendOrder = ++order; row.control.navigationSentAtMs = performance.now();
      const commit = documentCommit(session, origin + '/model-manifest.json');
      try {
        const navigation = await send(session, 'Page.navigate', { url: origin + '/model-manifest.json' });
        requireValue(!navigation.errorText && isId(navigation.frameId), 'BASE_NAVIGATION_FAILED');
        row.control.navigation = { frameId: navigation.frameId, loaderId: navigation.loaderId ?? null, url: origin + '/model-manifest.json' };
        row.control.documentCommit = await commit.confirm(navigation);
      } finally { commit.stop(); }
      const location = await send(session, 'Runtime.evaluate', { expression: 'location.origin + location.pathname', returnByValue: true, contextId: row.control.documentCommit.executionContextId });
      requireValue(!location.exceptionDetails && location.result?.value === origin + '/model-manifest.json', 'BASE_DOCUMENT_NOT_COMMITTED');
      await gate('before-reader', row); requireValue(!fatal, fatal ?? 'CAPTURE_FAILED');
      phase = 'reader'; row.control.runtimeSendOrder = ++order; row.control.expressionSha256 = expression.sha256;
      try {
        const value = await send(session, 'Runtime.evaluate', { expression: expression.expression, awaitPromise: true, returnByValue: true, timeout: LIMITS.runtimeMs, contextId: row.control.documentCommit.executionContextId }, LIMITS.runtimeMs);
        requireValue(!value.exceptionDetails && value.result && Buffer.byteLength(JSON.stringify(value.result.value)) <= 32768, 'FIRST_PARTY_RESULT_INVALID');
        row.firstParty = safeFirstParty(value.result.value);
      } catch (error) {
        const code = errorCode(error, 'RUNTIME_EVALUATION_FAILED');
        row.control.runtimeDeadlineExpired = code === 'CDP_COMMAND_DEADLINE' || code === 'COMMAND_TIMEOUT';
        row.firstParty = { outcome: 'ERROR', code };
        if (code.startsWith('FIRST_PARTY_')) fail(code);
      }
      requireValue(!fatal, fatal ?? 'CAPTURE_FAILED');
      phase = 'terminal'; row.control.terminalDeadlineExpired = await terminalWait(session, observer, () => fatal);
      try { row.server = await transport.receipt(inputs.length + 1); }
      catch (error) { row.server = { unavailable: true, code: errorCode(error, 'SERVER_RECEIPT_UNAVAILABLE') }; }
      await gate('after-reader-and-terminal', row);
    } catch (error) {
      row.notRunReason = errorCode(error, 'CASE_SETUP_OR_GUARD_FAILED'); fail(row.notRunReason);
    } finally {
      // Stop both captures before detaching/disposal; cleanup events never fill a
      // missing terminal. No Browser.close, process kill or client.close here.
      try { if (observer) { await bounded(observer.prepareClose(), 10000, 'OBSERVER_PREPARE_TIMEOUT'); await bounded(observer.close(), 3000, 'OBSERVER_CLOSE_TIMEOUT'); } }
      catch (error) { row.cleanup.errors.push(errorCode(error, 'OBSERVER_CLOSE_FAILED')); fail('OBSERVER_CLOSE_FAILED'); }
      header?.stop();
      row.native = observer?.snapshot() ?? null; row.headers = header?.state.rows ?? [];
      const captureClosed = row.native?.status === 'CLOSED';
      row.capture = { stoppedBeforeContextCleanup: captureClosed, nativeClosedAtMs: captureClosed ? performance.now() : null, headerFatal: header?.state.fatal ?? null, headerDropped: header?.state.dropped ?? 0, lastPhase: phase };
      try {
        await bounded(Promise.allSettled(resourceLedger.map(item => item.pending)), client.commandTimeoutMs + 100, 'RESOURCE_RESPONSE_DRAIN_TIMEOUT');
        row.cleanup.resourcesDrained = resourceLedger.every(item => item.entry.state === 'ACK_OWNED' && item.entry.ownershipUnknown === false);
        if (!row.cleanup.resourcesDrained) { row.cleanup.errors.push('RESOURCE_OWNERSHIP_UNRESOLVED'); fail('RESOURCE_OWNERSHIP_UNRESOLVED'); }
      } catch (error) { row.cleanup.errors.push(errorCode(error, 'RESOURCE_RESPONSE_DRAIN_FAILED')); fail('RESOURCE_RESPONSE_DRAIN_FAILED'); }
      row.resourceCommands = resourceLedger.map(item => structuredClone(item.entry));
      row.cleanup.startedAtMs = performance.now();
      if (session) { session.off('Page.javascriptDialogOpening', onDialog); session.off('Page.fileChooserOpened', onFile); }
      if (row.sessionId && ownedSessions.has(row.sessionId)) {
        try { await send(root, 'Target.detachFromTarget', { sessionId: row.sessionId }, client.commandTimeoutMs + 100); row.cleanup.sessionDetached = true; }
        catch (error) { row.cleanup.errors.push(errorCode(error, 'SESSION_DETACH_FAILED')); fail('SESSION_DETACH_FAILED'); }
      }
      if (row.targetId && ownedTargets.has(row.targetId)) {
        try { const closed = await send(root, 'Target.closeTarget', { targetId: row.targetId }, client.commandTimeoutMs + 100); requireValue(closed.success === true, 'TARGET_CLOSE_NOT_CONFIRMED'); row.cleanup.targetClosed = true; }
        catch (error) { row.cleanup.errors.push(errorCode(error, 'TARGET_CLOSE_FAILED')); fail('TARGET_CLOSE_FAILED'); }
      }
      if (row.contextId && ownedContexts.has(row.contextId)) {
        try { await send(root, 'Target.disposeBrowserContext', { browserContextId: row.contextId }, client.commandTimeoutMs + 100); row.cleanup.contextDisposed = true; }
        catch (error) { row.cleanup.errors.push(errorCode(error, 'CONTEXT_DISPOSE_FAILED')); fail('CONTEXT_DISPOSE_FAILED'); }
      }
      try { await gate('after-context-cleanup', row); }
      catch (error) { row.cleanup.errors.push(errorCode(error, 'PRIMARY_CLEANUP_GUARD_FAILED')); fail('PRIMARY_CLEANUP_GUARD_FAILED'); }
    }
    inputs.push(row);
    await save('cases/' + expected.id + '/native-network.json', row.native);
    await save('cases/' + expected.id + '/native-headers.json', row.headers);
    await save('cases/' + expected.id + '/first-party.json', row.firstParty ?? null);
    await save('cases/' + expected.id + '/server-receipt.json', row.server ?? null);
    await save('cases/' + expected.id + '/control.json', { id: row.id, mode: row.mode, pair: row.pair, contextId: row.contextId, targetId: row.targetId, nativeSessionId: row.sessionId, control: row.control, capture: row.capture, cleanup: row.cleanup, resourceCommands: row.resourceCommands, notRunReason: row.notRunReason ?? null });
  }
  const result = { ...classifyRun(inputs), executionKind, version, fatal, failures: [], artifactRoot: 'cases', guardRecords, expression: { sha256: expression.sha256, bytes: expression.bytes } };
  result.failures = result.cases.filter(row => row.status === 'FAIL').map(row => ({ id: row.id, nativeFailureCount: row.nativeFailures.length, reasons: row.reasons }));
  await save('evidence-index.json', inputs.map(row => ({ id: row.id, mode: row.mode, pair: row.pair, notRunReason: row.notRunReason ?? null, directory: row.contextId ? 'cases/' + row.id : null })));
  await save('protocol-result.json', result);
  return result;
}
