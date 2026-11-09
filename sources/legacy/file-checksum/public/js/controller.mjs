import { serializeHash } from './core/checksum.mjs';
import { createSession, reduceSession, isBusy } from './core/session.mjs';
import { WORKER_SOURCE } from './worker-source.mjs';

export const DOWNLOAD_NAME = 'glossquote-sha256.txt';
export function displayFileName(name) {
  return String(name).replace(/[\p{Cc}\p{Cf}]/gu, character => `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
}
export class ChecksumController {
  #environment;
  #callbacks;
  #state = createSession();
  #file = null;
  #active = null;
  #downloads = new Map();
  #outputStatus = 'idle';
  #copyRequest = null;
  #fatal = null;

  constructor({ environment = globalThis, onChange = () => {}, resetInputs = () => {}, focus = () => {}, copyFallback = () => {}, requestDownload = () => {} } = {}) {
    this.#environment = environment;
    this.#callbacks = { onChange, resetInputs, focus, copyFallback, requestDownload };
  }
  get supported() {
    const e = this.#environment;
    return this.#fatal === null && e.isSecureContext === true && typeof e.File === 'function'
      && typeof e.Worker === 'function' && typeof e.Blob === 'function'
      && typeof e.URL?.createObjectURL === 'function' && typeof e.URL?.revokeObjectURL === 'function'
      && typeof e.crypto?.subtle?.digest === 'function' && typeof e.performance?.now === 'function'
      && typeof e.setTimeout === 'function' && typeof e.clearTimeout === 'function';
  }
  get snapshot() {
    return Object.freeze({ state: this.#state, supported: this.supported,
      environmentError: this.#fatal ?? (this.supported ? null : 'UNSUPPORTED_ENVIRONMENT'),
      hasFile: this.#file !== null, fileName: this.#file === null ? '' : displayFileName(this.#file.name),
      outputStatus: this.#outputStatus });
  }
  refresh() { this.#notify(); }
  #notify() { this.#callbacks.onChange(this.snapshot); }
  #now() {
    const clock = this.#environment.performance?.now;
    return typeof clock === 'function' ? clock.call(this.#environment.performance) : 0;
  }
  #apply(action) {
    try { this.#state = reduceSession(this.#state, action); return true; }
    catch {
      this.#releaseActive(); this.#resetOutput(); this.#file = null;
      this.#state = createSession(); this.#fatal = 'WORKER_PROTOCOL';
      this.#callbacks.resetInputs(); return false;
    }
  }
  #resetOutput() {
    this.#copyRequest = null;
    this.#outputStatus = 'idle';
    for (const url of [...this.#downloads.keys()]) this.#revokeDownload(url);
  }
  #revokeDownload(url) {
    const timer = this.#downloads.get(url);
    this.#downloads.delete(url);
    if (timer !== undefined) this.#environment.clearTimeout(timer);
    try { this.#environment.URL.revokeObjectURL(url); } catch { /* Drop owned references even if the API fails. */ }
  }
  #releaseActive() {
    const context = this.#active;
    this.#active = null;
    if (context === null) return;
    if (context.timer !== null) this.#environment.clearTimeout(context.timer);
    if (context.worker !== null) {
      for (const [type, handler] of Object.entries(context.handlers)) {
        try { context.worker.removeEventListener?.(type, handler); } catch { /* Continue releasing the other resources. */ }
      }
      try { context.worker.terminate?.(); } catch { /* No exception text enters status or logs. */ }
    }
    if (context.url !== null) {
      try { this.#environment.URL.revokeObjectURL(context.url); } catch { /* No raw errors or input data are reported. */ }
    }
    context.worker = null; context.url = null; context.timer = null; context.handlers = {};
  }
  #current(context) {
    return this.#active === context && isBusy(this.#state) && this.#state.activeJobId === context.jobId
      && this.#state.fileRevision === context.fileRevision;
  }
  #receive(context, event, failure = null) {
    if (!this.#current(context)) return;
    const common = { jobId: context.jobId, fileRevision: context.fileRevision, now: this.#now() };
    if (failure !== null) this.#apply({ type: 'fail', ...common, code: failure });
    else this.#apply({ type: 'reply', ...common, message: event.data });
    if (!this.#current(context)) this.#releaseActive();
    this.#notify();
  }
  #armDeadline(context) {
    if (!this.#current(context)) return;
    const delay = Math.max(0, this.#state.deadline - this.#now());
    context.timer = this.#environment.setTimeout(() => {
      if (!this.#current(context)) return;
      context.timer = null;
      this.checkDeadline();
      if (this.#current(context)) this.#armDeadline(context);
    }, delay);
  }
  selectFile(file) {
    const e = this.#environment;
    const validBrand = typeof e.File === 'function' && file instanceof e.File;
    this.#apply({ type: 'select', size: validBrand ? file.size : NaN });
    this.#releaseActive(); this.#resetOutput();
    this.#file = validBrand && this.#state.fileSize !== null && this.#fatal === null ? file : null;
    this.#notify();
    return this.#state.fileSize !== null;
  }
  setExpected(source) { this.#apply({ type: 'expected', source }); this.#notify(); }
  start() {
    if (this.#fatal !== null) return false;
    const previous = this.#state;
    if (!this.#apply({ type: 'start', now: this.#now() })) { this.#notify(); return false; }
    if (this.#state === previous) return false;
    this.#releaseActive(); this.#resetOutput();
    if (!isBusy(this.#state)) { this.#notify(); return false; }
    const context = { jobId: this.#state.activeJobId, fileRevision: this.#state.fileRevision,
      worker: null, url: null, timer: null, handlers: {} };
    this.#active = context;
    this.#notify();
    if (!this.supported) { this.#receive(context, null, 'UNSUPPORTED_ENVIRONMENT'); return false; }
    try {
      const e = this.#environment;
      context.url = e.URL.createObjectURL(new e.Blob([WORKER_SOURCE], { type: 'text/javascript' }));
      context.worker = new e.Worker(context.url, { type: 'module' });
      if (['addEventListener', 'removeEventListener', 'terminate', 'postMessage'].some(key => typeof context.worker[key] !== 'function')) throw new Error('WORKER_START_FAILED');
      context.handlers = {
        message: event => this.#receive(context, event),
        error: event => { event.preventDefault?.(); this.#receive(context, null, 'WORKER_FAILED'); },
        messageerror: event => { event.preventDefault?.(); this.#receive(context, null, 'WORKER_MESSAGE_FAILED'); },
      };
      for (const [type, handler] of Object.entries(context.handlers)) context.worker.addEventListener(type, handler);
      this.#armDeadline(context);
      this.checkDeadline();
      if (!this.#current(context)) return false;
      context.worker.postMessage({ type: 'hash', jobId: context.jobId, file: this.#file });
      this.checkDeadline();
      return this.#state.phase !== 'error';
    } catch {
      this.#receive(context, null, 'WORKER_START_FAILED');
      return false;
    }
  }
  checkDeadline() {
    if (this.#fatal !== null || !isBusy(this.#state)) return;
    const context = this.#active;
    const previous = this.#state;
    this.#apply({ type: 'check-deadline', now: this.#now() });
    if (context !== null && !this.#current(context)) this.#releaseActive();
    if (previous !== this.#state) this.#notify();
  }
  cancel() {
    if (!isBusy(this.#state)) return;
    this.#apply({ type: 'cancel' }); this.#releaseActive(); this.#resetOutput(); this.#notify();
    this.#callbacks.focus('calculate');
  }
  clear({ pagehide = false } = {}) {
    this.#apply({ type: pagehide ? 'pagehide' : 'clear' });
    this.#releaseActive(); this.#resetOutput(); this.#file = null;
    this.#callbacks.resetInputs(); this.#notify();
    if (!pagehide) this.#callbacks.focus('file');
  }
  async copy() {
    const hash = this.#state.hash;
    if (hash === null || this.#file === null) return false;
    const revision = this.#state.outputRevision;
    const request = {};
    this.#copyRequest = request;
    const current = () => request === this.#copyRequest && revision === this.#state.outputRevision && hash === this.#state.hash;
    this.#outputStatus = 'copy-pending'; this.#notify();
    try {
      await this.#environment.navigator.clipboard.writeText(hash);
      if (!current()) return false;
      this.#outputStatus = 'copied'; this.#notify(); return true;
    } catch {
      if (!current()) return false;
      this.#outputStatus = 'copy-denied'; this.#notify(); this.#callbacks.copyFallback(); return false;
    }
  }
  download() {
    const hash = this.#state.hash;
    if (hash === null || this.#file === null) return false;
    this.#copyRequest = null;
    const revision = this.#state.outputRevision;
    let url = null;
    try {
      const e = this.#environment;
      const bytes = serializeHash(hash);
      url = e.URL.createObjectURL(new e.Blob([bytes], { type: 'text/plain;charset=utf-8' }));
      this.#downloads.set(url, undefined);
      this.#callbacks.requestDownload(url, DOWNLOAD_NAME);
      if (revision !== this.#state.outputRevision || hash !== this.#state.hash) {
        if (this.#downloads.has(url)) this.#revokeDownload(url);
        return false;
      }
      this.#downloads.set(url, e.setTimeout(() => this.#revokeDownload(url), 1000));
      this.#outputStatus = 'download-requested'; this.#notify(); return true;
    } catch {
      if (url !== null) this.#revokeDownload(url);
      this.#outputStatus = 'download-failed'; this.#notify(); return false;
    }
  }
}
