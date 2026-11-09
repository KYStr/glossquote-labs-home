import { ImageInputError, clearCanvas } from './errors.mjs';
import { preflightSelection, validateFileSizes } from './image-preflight.mjs';
import { generateContactSheet } from './generate.mjs';
import { normalizeColumns } from './layout.mjs';

export class DownloadUrls {
  constructor({ create = (blob) => URL.createObjectURL(blob), revoke = (url) => URL.revokeObjectURL(url),
    timer = (callback, delay) => globalThis.setTimeout(callback, delay),
    untimer = (handle) => globalThis.clearTimeout(handle) } = {}) {
    this.create = create; this.revoke = revoke; this.timer = timer; this.untimer = untimer;
    this.entries = new Map();
  }
  add(blob) {
    const url = this.create(blob);
    // Register ownership before scheduling so failures and reentrant callbacks cannot orphan a URL.
    this.entries.set(url, null);
    try {
      const timeout = this.timer(() => this.release(url), 60_000);
      if (this.entries.has(url)) this.entries.set(url, timeout);
      else this.untimer(timeout);
      return url;
    } catch (error) {
      this.release(url);
      throw error;
    }
  }
  release(url) {
    if (!this.entries.has(url)) return;
    const timeout = this.entries.get(url);
    this.entries.delete(url);
    try { if (timeout !== null) this.untimer(timeout); }
    finally { this.revoke(url); }
  }
  clear() {
    const failures = [];
    for (const url of [...this.entries.keys()]) {
      try { this.release(url); } catch (error) { failures.push(error); }
    }
    if (failures.length) throw failures[0];
  }
}

export class ContactSheetSession {
  constructor({ canvas, decode, yieldControl, onChange = () => {}, urls = new DownloadUrls() }) {
    this.canvas = canvas; this.decode = decode; this.yieldControl = yieldControl;
    this.onChange = onChange; this.urls = urls;
    this.files = []; this.items = []; this.options = { columns: undefined, showNames: false };
    this.generation = 0; this.pending = null; this.abort = null;
    this.phase = 'idle'; this.progress = null; this.error = null; this.result = null;
    this.cleanupError = null;
    this.disposed = false;
  }
  notify() { this.onChange(this); }
  get busy() { return this.pending !== null; }
  invalidate(phase = 'stale') {
    this.generation++;
    this.abort?.abort(); this.abort = null;
    this.result = null;
    try { this.urls.clear(); } catch {
      // Keep a fixed diagnostic, never a raw exception that could retain input references.
      // URL failure must not interrupt reset/dispose or the remaining session cleanup.
      this.cleanupError = new ImageInputError('PNG_EXPORT_FAILED', { stage: 'url_cleanup' });
    }
    clearCanvas(this.canvas);
    this.error = null; this.progress = null;
    this.phase = this.busy ? 'cancelling' : phase;
  }
  control(token) {
    const abort = new AbortController(); this.abort = abort;
    return { canvas: this.canvas, decode: this.decode, yieldControl: this.yieldControl,
      signal: abort.signal, generation: token,
      isCurrent: (value) => !this.disposed && value === this.generation,
      onProgress: (progress) => {
        if (token !== this.generation || this.disposed) return;
        this.progress = progress; this.phase = progress.phase; this.notify();
      },
    };
  }
  finish(task) {
    if (this.pending !== task) return;
    this.pending = null; this.abort = null;
    if (this.phase === 'cancelling') this.phase = this.files.length ? 'stale' : 'idle';
    this.notify();
  }
  async replaceFiles(files) {
    if (this.disposed) return;
    const previous = this.pending;
    this.invalidate();
    this.files = Array.from(files); this.items = [];
    if (this.options.columns !== undefined && this.files.length > 0 && this.files.length <= 30) {
      this.options.columns = normalizeColumns(this.files.length, this.options.columns);
    }
    if (!this.files.length) { this.phase = previous ? 'cancelling' : 'idle'; this.notify(); return; }
    try { validateFileSizes(this.files); } catch (error) {
      this.phase = 'blocked'; this.error = error; this.notify(); return;
    }
    const token = this.generation;
    let workFiles = this.files.slice();
    // A new selection waits for the old native decode/encode. No two generators share the canvas.
    let task;
    task = (async () => {
      if (previous) await previous.catch(() => {});
      if (token !== this.generation || this.disposed) return;
      this.phase = 'preflighting'; this.notify();
      try {
        const items = await preflightSelection(workFiles, this.control(token));
        if (token !== this.generation || this.disposed) return;
        this.items = items; this.phase = 'ready'; this.progress = null;
      } catch (error) {
        if (token === this.generation && !this.disposed) {
          this.phase = 'blocked'; this.error = error instanceof ImageInputError ? error : new ImageInputError('IMAGE_HEADER_INVALID');
        }
      } finally { workFiles = null; }
    })();
    this.pending = task; this.notify();
    await task;
    this.finish(task);
  }
  setOptions(patch) {
    if (this.disposed) return;
    let columns = this.options.columns;
    if (Object.hasOwn(patch, 'columns')) {
      columns = patch.columns;
      normalizeColumns(Math.max(1, Math.min(30, this.files.length)), columns);
      if (this.files.length > 0 && this.files.length <= 30) columns = normalizeColumns(this.files.length, columns);
    }
    const showNames = Object.hasOwn(patch, 'showNames') ? patch.showNames === true : this.options.showNames;
    if (columns === this.options.columns && showNames === this.options.showNames) return;
    this.options = { columns, showNames };
    this.invalidate(this.files.length ? 'stale' : 'idle'); this.notify();
  }
  reorder(index, direction) {
    const next = index + direction;
    if (this.disposed || ![-1, 1].includes(direction) || !Number.isInteger(index) || index < 0 || next < 0 || next >= this.files.length) return;
    this.invalidate();
    [this.files[index], this.files[next]] = [this.files[next], this.files[index]];
    if (this.items.length === this.files.length) [this.items[index], this.items[next]] = [this.items[next], this.items[index]];
    this.notify();
  }
  async generate() {
    if (this.disposed || this.busy || !this.files.length) return;
    if (this.items.length !== this.files.length) return this.replaceFiles(this.files);
    this.invalidate('rendering');
    const token = this.generation;
    const control = this.control(token);
    this.phase = 'rendering';
    const task = generateContactSheet(this.items.slice(), this.options, control);
    this.pending = task; this.notify();
    try {
      const result = await task;
      if (token === this.generation && !this.disposed) { this.result = result; this.phase = 'result'; this.progress = null; }
    } catch (error) {
      if (token === this.generation && !this.disposed) {
        this.phase = 'failed'; this.error = error instanceof ImageInputError ? error : new ImageInputError('CANVAS_UNAVAILABLE');
      }
    } finally { this.finish(task); }
  }
  cancel() {
    if (!this.busy) return;
    this.invalidate(); this.notify();
  }
  reset() {
    this.invalidate('idle'); this.files = []; this.items = [];
    this.options = { columns: undefined, showNames: false }; this.notify();
  }
  dispose() {
    this.reset(); this.disposed = true; this.onChange = () => {};
  }
  resume(onChange) {
    if (!this.disposed) return;
    this.disposed = false; this.onChange = onChange; this.notify();
  }
  download(kind, trigger) {
    if (this.disposed || this.busy || this.phase !== 'result' || !this.result || !['png', 'text'].includes(kind)) return false;
    const blob = kind === 'png' ? this.result.png : new Blob([this.result.indexText], { type: 'text/plain;charset=utf-8' });
    let url;
    try {
      url = this.urls.add(blob);
      trigger(url, kind === 'png' ? 'photo-contact-sheet.png' : 'photo-contact-sheet-index.txt');
      return true;
    } catch {
      if (url) this.urls.release(url);
      this.invalidate('failed'); this.error = new ImageInputError('PNG_EXPORT_FAILED'); this.notify();
      return false;
    }
  }
}
