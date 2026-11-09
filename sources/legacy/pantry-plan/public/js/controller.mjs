import { Session } from './core/session.mjs';
import { LIMITS, serializeProject } from './core/schema.mjs';
import { calculateShopping, serializeReport, shoppingText } from './core/shopping.mjs';
import { InputError } from './core/quantities.mjs';

export const EXPORTS = Object.freeze({
  txt: { filename: 'pantry-shopping-list.txt', type: 'text/plain;charset=utf-8' },
  report: { filename: 'pantry-shopping-report.json', type: 'application/json;charset=utf-8' },
  project: { filename: 'pantry-project.json', type: 'application/json;charset=utf-8' },
});

export class Controller {
  constructor({ io, onChange = () => {} }) {
    this.io = io; this.onChange = onChange; this.session = new Session();
    this.reader = null; this.urls = new Map(); this.copyGeneration = 0; this.disposed = false;
  }
  emit(kind, message = '') { if (!this.disposed) this.onChange(kind, message); }
  releaseDownloads() {
    for (const [url, timer] of this.urls) { this.io.clearTimeout(timer); this.io.revokeURL(url); }
    this.urls.clear();
  }
  abortReader() {
    if (!this.reader) return;
    const reader = this.reader; this.reader = null;
    reader.onload = null; reader.onerror = null; reader.onabort = null;
    if (reader.readyState === 1) reader.abort();
  }
  invalidate() { this.copyGeneration++; this.abortReader(); this.releaseDownloads(); this.session.invalidate(); }
  edit(change) {
    this.invalidate();
    try { change(this.session.project); } catch (error) { this.session.fail(error); }
    this.emit('edit');
  }
  clear() { this.invalidate(); this.session.clear(); this.emit('edit'); }
  replace(project) {
    this.invalidate();
    try { this.session.replace(project); } catch (error) { this.session.fail(error); }
    this.emit('replace');
  }
  calculate() {
    this.invalidate();
    const project = this.session.project;
    if (project.stock.length + project.meals.reduce((n, meal) => n + meal.items.length, 0) === 0) this.session.fail(new InputError('EMPTY_INPUT'));
    else this.session.calculate();
    this.emit('calculate');
    return this.session.result;
  }
  mark(key, selected) {
    this.copyGeneration++; this.releaseDownloads();
    const ok = this.session.markPurchased(key, selected);
    this.emit('progress'); return ok;
  }
  beginImport(file) {
    this.invalidate();
    const generation = this.session.beginImport();
    if (!file || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > LIMITS.importBytes) {
      this.session.fail(new InputError('IMPORT_TOO_LARGE')); this.emit('import'); return;
    }
    this.emit('import');
    try {
      const reader = this.io.createReader(); this.reader = reader;
      reader.onload = () => {
        if (this.disposed || generation !== this.session.generation || this.reader !== reader) return;
        this.reader = null;
        try {
          const text = this.io.decodeUTF8(reader.result);
          this.session.preview(text, generation);
        } catch { this.session.fail(new InputError('READ_FAILED')); }
        reader.onload = null; reader.onerror = null; reader.onabort = null;
        this.emit('preview');
      };
      reader.onerror = () => {
        if (this.disposed || generation !== this.session.generation || this.reader !== reader) return;
        this.reader = null; reader.onload = null; reader.onerror = null; reader.onabort = null;
        this.session.fail(new InputError('READ_FAILED')); this.emit('import');
      };
      reader.readAsArrayBuffer(file);
    } catch { this.abortReader(); this.session.fail(new InputError('READ_FAILED')); this.emit('import'); }
  }
  cancelImport() { this.invalidate(); this.session.cancelImport(); this.emit('cancel'); }
  confirmImport() {
    const accepted = this.session.confirmImport();
    this.copyGeneration++; this.releaseDownloads(); this.emit('replace'); return accepted;
  }
  exportText(kind, words) {
    if (!Object.hasOwn(EXPORTS, kind)) throw new InputError('NOT_READY');
    if (kind === 'project') { calculateShopping(this.session.project); return serializeProject(this.session.project); }
    if (!this.session.result || this.session.state !== 'ready') throw new InputError('NOT_READY');
    return kind === 'txt' ? shoppingText(this.session.result, words, this.session.checked) : serializeReport(this.session.result, this.session.checked, words);
  }
  download(kind, words) {
    this.releaseDownloads();
    try {
      const text = this.exportText(kind, words);
      const spec = EXPORTS[kind];
      const url = this.io.createURL(text, spec.type);
      this.urls.set(url, null);
      // Keep ownership until the browser has had up to 30 seconds to take the download.
      const timer = this.io.setTimeout(() => { if (this.urls.has(url)) { this.io.revokeURL(url); this.urls.delete(url); } }, 30000);
      this.urls.set(url, timer);
      this.io.startDownload(url, spec.filename);
      this.emit('download'); return true;
    } catch (error) { this.releaseDownloads(); this.session.fail(error); this.emit('error'); return false; }
  }
  async copy(words) {
    const generation = ++this.copyGeneration;
    const revision = this.session.revision;
    try {
      const text = this.exportText('txt', words);
      this.emit('copying');
      await this.io.writeClipboard(text);
      if (this.disposed || generation !== this.copyGeneration || revision !== this.session.revision || !this.session.result) return false;
      this.emit('copied'); return true;
    } catch {
      if (!this.disposed && generation === this.copyGeneration && revision === this.session.revision && this.session.result) this.emit('copy-fallback');
      return false;
    }
  }
  dispose() {
    this.invalidate(); this.session.clear(); this.disposed = true;
  }
}
