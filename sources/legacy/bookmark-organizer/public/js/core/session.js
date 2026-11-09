import { MAX_BYTES } from './utf8.js';
import { errorResult } from './errors.js';
import { createOutputs } from './export-json.js';
export class OrganizerSession {
  constructor({ workerFactory, objectUrls = URL, outputs = createOutputs, onChange = () => {} }) {
    this.workerFactory = workerFactory;
    this.objectUrls = objectUrls;
    this.outputs = outputs;
    this.onChange = onChange;
    this.epoch = 0;
    this.revision = 0;
    this.worker = null;
    this.urls = new Map();
    this.state = { phase: 'empty', jobId: null, sourceName: '', sourceBytes: 0, job: null, error: null };
  }
  emit() { this.onChange(this.state); }
  clearOutputs() {
    for (const value of this.urls.values()) this.objectUrls.revokeObjectURL(value);
    this.urls.clear();
    if (this.state.job) { this.state.job.exportHtml = null; this.state.job.backupJson = null; }
  }
  reset(phase = 'empty') {
    this.epoch++;
    this.revision++;
    if (this.worker) { this.worker.postMessage({ type: 'cancel', jobId: this.state.jobId }); this.worker.terminate(); }
    this.worker = null;
    this.clearOutputs();
    this.state = { phase, jobId: null, sourceName: '', sourceBytes: 0, job: null, error: null };
    this.emit();
  }
  cancel() { this.reset('canceled'); }
  dispose() { this.reset(); }
  reject(jobId, error) {
    if (this.state.jobId !== jobId) return;
    this.worker?.terminate();
    this.worker = null;
    this.clearOutputs();
    this.state.job = null;
    this.state.phase = 'error';
    this.state.error = errorResult(jobId, error).error;
    this.emit();
  }
  async select(file) {
    this.reset('selected');
    if (!file) { this.reset(); return; }
    const epoch = this.epoch;
    const jobId = `job-${epoch}`;
    this.state = { phase: 'selected', jobId, sourceName: String(file.name ?? ''), sourceBytes: file.size, job: null, error: null };
    this.emit();
    if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_BYTES) { this.reject(jobId, { code: 'INPUT_TOO_LARGE', offset: 0 }); return; }
    this.state.phase = 'decoding';
    this.emit();
    try {
      const buffer = await file.arrayBuffer();
      if (this.epoch !== epoch) return;
      if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== file.size) { this.reject(jobId, { code: 'INVALID_STRUCTURE', offset: 0 }); return; }
      const worker = this.workerFactory();
      this.worker = worker;
      worker.onmessage = event => {
        const message = event.data;
        if (this.epoch !== epoch || this.worker !== worker || message?.jobId !== jobId) return;
        if (message.type === 'phase' && ['decoding', 'tokenizing'].includes(message.phase)) { this.state.phase = message.phase; this.emit(); return; }
        if (message.type !== 'result' || message.result?.jobId !== jobId) return;
        worker.terminate();
        this.worker = null;
        if (message.result.status === 'ready') {
          this.state.job = { ...message.result, sourceName: this.state.sourceName, sourceBytes: this.state.sourceBytes, exportHtml: null, backupJson: null };
          this.state.phase = 'ready-to-export';
          this.state.error = null;
          this.emit();
        } else this.reject(jobId, message.result.error);
      };
      worker.onerror = () => this.reject(jobId, { code: 'INVALID_STRUCTURE', offset: 0 });
      worker.postMessage({ type: 'parse', jobId, bytes: buffer }, [buffer]);
    } catch { if (this.epoch === epoch) this.reject(jobId, { code: 'INVALID_STRUCTURE', offset: 0 }); }
  }
  edit(operation) {
    if (!this.state.job) return false;
    this.clearOutputs();
    operation(this.state.job);
    this.revision++;
    this.state.phase = 'ready-to-export';
    this.emit();
    return true;
  }
  download(kind) {
    if (!this.state.job || this.state.phase !== 'ready-to-export' || !['html', 'json'].includes(kind)) return null;
    const job = this.state.job;
    if (!job.exportHtml || !job.backupJson) Object.assign(job, this.outputs(job));
    const previous = this.urls.get(kind);
    if (previous) this.objectUrls.revokeObjectURL(previous);
    const url = this.objectUrls.createObjectURL(kind === 'html' ? job.exportHtml : job.backupJson);
    this.urls.set(kind, url);
    return { url, filename: kind === 'html' ? 'bookmarks-organized.html' : 'duplicate-report.json' };
  }
}
