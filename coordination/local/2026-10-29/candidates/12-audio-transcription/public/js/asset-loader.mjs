import { validateSelectedManifest, totalAssetBytes } from './core/manifest.mjs';
import { memoryPhase, memoryTraceJob, createReadReceipt, READ_EVENT, READ_REASON } from './core/memory-phases.mjs';

const failure = code => new Error(code);
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

export class AssetLoader {
  constructor({ origin, fetchImpl = globalThis.fetch.bind(globalThis), subtle = globalThis.crypto.subtle } = {}) {
    this.origin = new URL(origin ?? globalThis.location.origin).origin;
    this.nativeFetch = fetchImpl;
    this.subtle = subtle;
    this.verified = new Map();
    this.allowedReads = new Map();
    this.blockedReads = 0;
    this.nextReceiptId = 0;
  }

  async load(value, { signal, onProgress = () => {} } = {}) {
    const manifest = validateSelectedManifest(value); // Fixed candidate + complete file closure before any fetch.
    this.clear();
    memoryPhase('asset-load-start');
    const controller = new AbortController();
    let activeReceipt, abortReason = READ_REASON.NONE;
    const abort = () => { abortReason = READ_REASON.CALLER_SIGNAL; controller.abort(); activeReceipt?.record(READ_EVENT.ABORT_SIGNALLED, { signalAborted: 1, lockObserved: 0, reasonCode: abortReason }); };
    const expire = () => { abortReason = READ_REASON.TIMEOUT; controller.abort(); activeReceipt?.record(READ_EVENT.ABORT_SIGNALLED, { signalAborted: 1, lockObserved: 0, reasonCode: abortReason }); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timeout = setTimeout(expire, 180_000);
    let loaded = 0;
    let downloadMs = 0;
    let integrityMs = 0;
    try {
      const total = totalAssetBytes(manifest);
      for (const [index, file] of manifest.files.entries()) {
        if (controller.signal.aborted) throw failure('MODEL_LOAD_FAILED');
        const receipt = memoryTraceJob() < 0 ? undefined : createReadReceipt({ scopeCode: 1, ordinal: index + 1, readId: ++this.nextReceiptId, expectedBytes: file.bytes, hasSignal: 1 });
        activeReceipt = receipt;
        const started = performance.now();
        const url = this.origin + file.path;
        let response, offset = 0, reasonCode = READ_REASON.NONE, completed = false;
        const snapshot = () => ({ receivedBytes: offset, readerLocked: Number(Boolean(response?.body?.locked)), lockObserved: 1, signalAborted: Number(controller.signal.aborted) });
        try {
          response = await this.nativeFetch(url, { method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal });
          if (response.status !== 200 || response.redirected || !response.body || (response.url && response.url !== url)) { reasonCode = READ_REASON.RESPONSE_REJECTED; throw failure('MODEL_LOAD_FAILED'); }
          const length = response.headers.get('content-length');
          const encoding = response.headers.get('content-encoding');
          if ((!encoding || encoding === 'identity') && length !== null && Number(length) !== file.bytes) {
            reasonCode = READ_REASON.HEADER_LENGTH; receipt?.record(READ_EVENT.CANCEL_CALLED, { ...snapshot(), reasonCode });
            await response.body.cancel(); throw failure('ASSET_INTEGRITY_FAILED');
          }
          const buffer = new Uint8Array(file.bytes);
          const reader = response.body.getReader();
          receipt?.record(READ_EVENT.READER_ACQUIRED, snapshot());
          for (;;) {
            const { done, value: chunk } = await reader.read();
            if (controller.signal.aborted) { reasonCode = abortReason || READ_REASON.CALLER_SIGNAL; receipt?.record(READ_EVENT.CANCEL_CALLED, { ...snapshot(), reasonCode }); await reader.cancel(); throw failure('MODEL_LOAD_FAILED'); }
            if (done) { receipt?.record(READ_EVENT.EOF, { ...snapshot(), eof: 1 }); break; }
            if (offset + chunk.byteLength > file.bytes) { reasonCode = READ_REASON.SIZE_CAP; receipt?.record(READ_EVENT.CANCEL_CALLED, { ...snapshot(), reasonCode }); await reader.cancel(); throw failure('ASSET_INTEGRITY_FAILED'); }
            buffer.set(chunk, offset); offset += chunk.byteLength; loaded += chunk.byteLength;
            receipt?.update({ receivedBytes: offset }); onProgress({ loaded, total });
          }
          if (offset !== file.bytes) { reasonCode = READ_REASON.SHORT_READ; throw failure('ASSET_INTEGRITY_FAILED'); }
          downloadMs += performance.now() - started;
          const hashStarted = performance.now();
          const digest = hex(new Uint8Array(await this.subtle.digest('SHA-256', buffer)));
          integrityMs += performance.now() - hashStarted;
          receipt?.record(READ_EVENT.HASH_RESULT, { ...snapshot(), hashChecked: 1, hashOk: Number(digest === file.sha256), reasonCode: digest === file.sha256 ? READ_REASON.NONE : READ_REASON.HASH_MISMATCH });
          if (digest !== file.sha256) { reasonCode = READ_REASON.HASH_MISMATCH; throw failure('ASSET_INTEGRITY_FAILED'); }
          if (controller.signal.aborted) { reasonCode = abortReason || READ_REASON.CALLER_SIGNAL; throw failure('MODEL_LOAD_FAILED'); }
          this.verified.set(file.path, { buffer, mime: file.mime }); completed = true;
        } catch (error) {
          receipt?.record(READ_EVENT.ERROR, { ...snapshot(), outcomeCode: 2, reasonCode: reasonCode || abortReason || READ_REASON.READ_ERROR });
          throw error;
        } finally {
          // MF19 M1 observes the existing locked-reader state. No releaseLock change.
          receipt?.record(READ_EVENT.FINISH, { ...snapshot(), outcomeCode: completed ? 1 : 2, reasonCode: reasonCode || (completed ? READ_REASON.NONE : abortReason || READ_REASON.READ_ERROR) });
          if (completed) activeReceipt = undefined;
        }
      }
      memoryPhase('asset-load-complete', { verifiedBytes: loaded });
      return { loadedBytes: loaded, downloadMs, integrityMs };
    } catch (error) {
      controller.abort();
      activeReceipt?.record(READ_EVENT.ABORT_SIGNALLED, { signalAborted: 1, lockObserved: 0, reasonCode: abortReason || READ_REASON.LOAD_ERROR });
      this.clear();
      throw failure(error.message === 'ASSET_INTEGRITY_FAILED' ? error.message : 'MODEL_LOAD_FAILED');
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }

  getVerifiedBytes(assetPath) {
    const entry = this.verified.get(assetPath);
    if (!entry) throw failure('ASSET_INTEGRITY_FAILED');
    memoryPhase('asset-reference-read', { assetBytes: entry.buffer.byteLength });
    return entry.buffer;
  }

  async fetch(input, options = {}) {
    const source = input instanceof Request ? input.url : String(input);
    const url = new URL(source, this.origin);
    const method = options.method ?? (input instanceof Request ? input.method : 'GET');
    if (method !== 'GET' || options.body !== undefined || url.origin !== this.origin || url.search || url.hash
      || /(?:^|\/)\.\.?\//u.test(source) || source.includes('\\') || url.pathname.includes('%')) {
      this.blockedReads += 1;
      throw failure('ASSET_REQUEST_BLOCKED');
    }
    const entry = this.verified.get(url.pathname);
    if (!entry) { this.blockedReads += 1; throw failure('ASSET_REQUEST_BLOCKED'); }
    this.allowedReads.set(url.pathname, (this.allowedReads.get(url.pathname) ?? 0) + 1);
    return this.createResponse(entry);
  }

  createResponse(entry) {
    memoryPhase('asset-response-created', { assetBytes: entry.buffer.byteLength, responseCopyBytes: entry.buffer.byteLength });
    return new Response(entry.buffer, { status: 200, headers: { 'Content-Type': entry.mime, 'Content-Length': String(entry.buffer.byteLength) } });
  }

  clear() {
    memoryPhase('asset-map-clear');
    this.verified.clear();
    this.allowedReads.clear();
    this.blockedReads = 0;
  }

  audit() { return { reads: Object.fromEntries(this.allowedReads), blockedReads: this.blockedReads }; }
}
