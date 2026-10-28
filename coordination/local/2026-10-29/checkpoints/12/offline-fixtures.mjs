import { EventEmitter } from 'node:events';
import { CASES, FIXTURE } from './evidence.mjs';

// All records below are synthetic. No HTTP, browser, media, native API or process.
export const ORIGIN = 'http://127.0.0.1:5192';
export const SERVER_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cache-Control': 'no-store', 'Content-Type': 'audio/wav', 'Content-Length': FIXTURE.bytes,
});
export function firstParty() {
  return { outcome: 'SUCCESS', receivedBytes: FIXTURE.bytes, sha256: FIXTURE.sha256, readerSha256: FIXTURE.readerSha256, overflow: false, receipts: [1, 2, 3, 8, 4].map((eventCode, sequence) => ({ phase: 'read-receipt', jobId: 0, sequence, wallTimeMs: 1760000000000 + sequence, monotonicMs: 100 + sequence, eventCode, scopeCode: 2, ordinal: 1, readId: 1, expectedBytes: FIXTURE.bytes, receivedBytes: sequence >= 2 ? FIXTURE.bytes : 0, eof: Number(sequence >= 2), hashChecked: Number(sequence === 4), hashOk: Number(sequence === 4), readerLocked: Number(sequence > 0), lockObserved: Number(sequence > 0), hasSignal: 0, signalAborted: 0, reasonCode: 0, outcomeCode: sequence >= 3 ? 1 : 0 })) };
}
export function serverReceipt(index) {
  const expected = CASES[index];
  return { sequence: index + 1, mode: expected.mode, path: FIXTURE.path, originalHandlerDelegated: true, status: 200, serverEvent: 'FINISH', writableFinished: true, firstError: null, acceptedFixedFixture: true, sourceBytes: FIXTURE.bytes, sourceSha256: FIXTURE.sha256, submittedBytes: FIXTURE.bytes, sourceWriteCalls: 3, sourceEndCalls: 1, transportEndCalls: 1, transportWriteCalls: expected.mode === 'A' ? 3 : 0, transportBodyEndCalls: expected.mode === 'B' ? 1 : 0, coalescedBytes: expected.mode === 'B' ? FIXTURE.bytes : 0, responseHeaders: { ...SERVER_HEADERS } };
}
export function cases() {
  return CASES.map((expected, index) => {
    const targetId = 'target-' + expected.id, sessionId = 'session-' + expected.id, contextId = 'context-' + expected.id, requestId = 'REUSED_ACROSS_CONTEXTS';
    const network = (method, details = {}) => ({ kind: 'network', method, targetId, sessionId: null, requestId, ...details });
    return { ...expected, targetId, sessionId, contextId,
      control: { targetInfo: { targetId, browserContextId: contextId, type: 'page', url: 'about:blank' }, sessionIdFromAttach: sessionId, networkReadyOrder: 1, navigationSendOrder: 2, runtimeSendOrder: 3, navigationSentAtMs: 20, runtimeDeadlineMs: 10000, terminalDeadlineMs: 5000, runtimeDeadlineExpired: false, terminalDeadlineExpired: false, prohibitedEvents: [], navigation: { frameId: 'frame-' + expected.id, url: ORIGIN + '/model-manifest.json' }, documentCommit: { frameId: 'frame-' + expected.id, url: ORIGIN + '/model-manifest.json', executionContextId: 1 } },
      native: { status: 'CLOSED', fatal: null, fatalCallbackError: false, origin: ORIGIN, rootTargetId: targetId, captureGaps: [], cleanupFailures: [], workers: [], unfinishedRequests: [], events: [
        { kind: 'observer', action: 'page-network-enabled', targetId, ackAtMs: 10 },
        network('Network.requestWillBeSent', { requestMethod: 'GET', resourceType: 'Fetch', url: FIXTURE.path, timestamp: 1, wallTime: 1760000000 }),
        network('Network.responseReceived', { response: { url: FIXTURE.path, status: 200, protocol: 'http/1.1', fromDiskCache: false, fromServiceWorker: false, fromPrefetchCache: false, headers: { 'content-length': String(FIXTURE.bytes), 'cache-control': 'no-store' } } }),
        network('Network.dataReceived', { dataLength: 65536 }), network('Network.dataReceived', { dataLength: FIXTURE.bytes - 65536 }),
        network('Network.loadingFinished', { encodedDataLength: FIXTURE.bytes + 600 }),
      ] },
      headers: [{ targetId, sessionId, requestId, status: 200, path: FIXTURE.path, headers: { ...SERVER_HEADERS, Date: 'Thu, 22 Oct 2026 00:00:00 GMT', Connection: 'keep-alive', 'Keep-Alive': 'timeout=5' } }],
      firstParty: firstParty(), server: serverReceipt(index), capture: { stoppedBeforeContextCleanup: true, headerFatal: null, headerDropped: 0, nativeClosedAtMs: 100 }, cleanup: { startedAtMs: 101, resourcesDrained: true, contextDisposed: true, targetClosed: true, sessionDetached: true, errors: [] },
    };
  });
}
export function failNative(row) {
  const end = row.native.events.find(event => event.method === 'Network.loadingFinished');
  end.method = 'Network.loadingFailed'; delete end.encodedDataLength; end.errorText = 'net::ERR_ABORTED'; end.canceled = true;
  return row;
}

class FakeSession extends EventEmitter {
  constructor(client, sessionId) { super(); this.client = client; this.sessionId = sessionId; }
  async send(method, params = {}) {
    this.client.commands.push({ sessionId: this.sessionId, method, params: structuredClone(params), atMs: performance.now() });
    return this.client.dispatch(this, method, params);
  }
}
export class FakeCdp {
  constructor({ aFails = false, holdNetwork, lateMethod, replyDelayMs = 20 } = {}) {
    this.commandTimeoutMs = 10000; this.commands = []; this.sessions = new Map(); this.targets = new Map(); this.liveContexts = new Set(); this.nativeAttachments = new Map(); this.ordinal = 0; this.aFails = aFails; this.holdNetwork = holdNetwork; this.lateMethod = lateMethod; this.replyDelayMs = replyDelayMs; this.lateReplyUsed = false;
  }
  session(id = null) { if (!this.sessions.has(id)) this.sessions.set(id, new FakeSession(this, id)); return this.sessions.get(id); }
  async reply(method, value) {
    if (method === this.lateMethod && !this.lateReplyUsed) {
      this.lateReplyUsed = true;
      // Offline fault injection: resource exists now, ACK arrives after the
      // shortened visible deadline. This is never used by the real adapter.
      await new Promise(resolve => setTimeout(resolve, this.replyDelayMs));
    }
    return value;
  }
  async dispatch(session, method, params) {
    if (session.sessionId === null) {
      if (method === 'Browser.getVersion') return { product: 'Chrome/155.0.8059.84', protocolVersion: '1.3', revision: 'offline-fake' };
      if (method === 'Target.createBrowserContext') { const browserContextId = 'fake-context-' + (++this.ordinal); this.liveContexts.add(browserContextId); return this.reply(method, { browserContextId }); }
      if (method === 'Target.createTarget') { const targetId = 'fake-target-' + this.ordinal; this.targets.set(targetId, { index: this.ordinal - 1, targetId, browserContextId: params.browserContextId, type: 'page', url: 'about:blank' }); return this.reply(method, { targetId }); }
      if (method === 'Target.attachToTarget') { const target = this.targets.get(params.targetId); const id = 'fake-session-' + this.ordinal; this.session(id).target = target; this.nativeAttachments.set(id, target.targetId); return this.reply(method, { sessionId: id }); }
      if (method === 'Target.detachFromTarget') { this.nativeAttachments.delete(params.sessionId); return {}; }
      if (method === 'Target.closeTarget') { const success = this.targets.delete(params.targetId); for (const [id, targetId] of this.nativeAttachments) if (targetId === params.targetId) this.nativeAttachments.delete(id); return { success }; }
      if (method === 'Target.disposeBrowserContext') { this.liveContexts.delete(params.browserContextId); for (const [id, target] of this.targets) if (target.browserContextId === params.browserContextId) this.targets.delete(id); return {}; }
      return {};
    }
    const target = session.target;
    if (method === 'Target.getTargetInfo') return { targetInfo: { targetId: target.targetId, browserContextId: target.browserContextId, type: 'page', url: target.url } };
    if (method === 'Network.enable' && this.holdNetwork && target.index === 0) await this.holdNetwork();
    if (method === 'Page.navigate') {
      target.url = params.url; const frameId = 'fake-frame-' + target.index;
      session.emit('Page.frameNavigated', { frame: { id: frameId, url: params.url, loaderId: 'fake-loader-' + target.index } });
      session.emit('Runtime.executionContextCreated', { context: { id: 1, origin: ORIGIN, auxData: { isDefault: true, frameId } } });
      return { frameId, loaderId: 'fake-loader-' + target.index };
    }
    if (method === 'Runtime.evaluate' && params.expression === 'location.origin + location.pathname') return { result: { value: target.url } };
    if (method === 'Runtime.evaluate') {
      const requestId = 'REUSED_ACROSS_ALL_FAKE_PAGES';
      session.emit('Network.requestWillBeSent', { requestId, timestamp: 100, wallTime: 1760000000, request: { url: ORIGIN + FIXTURE.path, method: 'GET' }, type: 'Fetch', initiator: { type: 'other' } });
      session.emit('Network.responseReceived', { requestId, timestamp: 100.01, type: 'Fetch', response: { url: ORIGIN + FIXTURE.path, status: 200, protocol: 'http/1.1', fromDiskCache: false, fromServiceWorker: false, fromPrefetchCache: false, mimeType: 'audio/wav', headers: { ...SERVER_HEADERS, 'Content-Length': String(FIXTURE.bytes), Date: 'Thu, 22 Oct 2026 00:00:00 GMT', Connection: 'keep-alive', 'Keep-Alive': 'timeout=5' } } });
      session.emit('Network.dataReceived', { requestId, timestamp: 100.02, dataLength: FIXTURE.bytes, encodedDataLength: FIXTURE.bytes });
      if (this.aFails && CASES[target.index].mode === 'A') session.emit('Network.loadingFailed', { requestId, timestamp: 100.03, errorText: 'net::ERR_ABORTED', canceled: true });
      else session.emit('Network.loadingFinished', { requestId, timestamp: 100.03, encodedDataLength: FIXTURE.bytes + 600 });
      return { result: { value: firstParty() } };
    }
    return {};
  }
}
