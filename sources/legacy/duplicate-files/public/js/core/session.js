import { describeFiles, validateSelection, errorResult, LIMITS, ERROR_CODES } from './limits.js';
import { chooseKeeper, serializeJSON, serializeTXT } from './report.js';
import { ALGORITHM } from './analyze.js';

export class AnalysisSession {
  constructor({ workerFactory, onChange = () => {}, createURL = blob => URL.createObjectURL(blob), revokeURL = url => URL.revokeObjectURL(url) }) {
    this.workerFactory = workerFactory; this.onChange = onChange;
    this.createURL = createURL; this.revokeURL = revokeURL;
    this.epoch = 0; this.worker = null; this.urls = new Map();
    this.files = []; this.result = null; this.error = null; this.progress = null;
    this.state = 'empty'; this.notice = 'empty';
  }
  snapshot() { return { state: this.state, files: this.files, result: this.result, error: this.error, progress: this.progress, notice: this.notice }; }
  emit() { this.onChange(this.snapshot()); }
  revokeDownloads() {
    for (const { url } of this.urls.values()) this.revokeURL(url);
    this.urls.clear();
  }
  stopWorker() {
    if (this.worker) { const worker = this.worker; this.worker = null; worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; worker.terminate(); }
  }
  invalidate() {
    // Advance epoch before termination: even a queued callback loses ownership.
    this.epoch++; this.stopWorker(); this.result = null; this.progress = null; this.error = null;
    this.revokeDownloads();
  }
  setFiles(rawFiles) {
    this.invalidate(); this.files = [];
    if (!Array.isArray(rawFiles) || rawFiles.length > LIMITS.files) {
      this.error = errorResult(`job-${this.epoch}`, Array.isArray(rawFiles) ? 'TOO_MANY_FILES' : 'READ_FAILED').error;
    } else {
      try {
        const descriptors = describeFiles(rawFiles);
        if (descriptors.length) {
          const validation = validateSelection(descriptors);
          if (validation.ok) this.files = validation.files;
          else {
            // Keep valid metadata for size-limit recovery; no contents are read.
            if (validation.errors[0].code !== 'READ_FAILED') this.files = descriptors;
            this.error = errorResult(`job-${this.epoch}`, validation.errors[0].code, validation.errors[0].fileIndexes).error;
          }
        }
      } catch { this.error = errorResult(`job-${this.epoch}`, 'READ_FAILED').error; }
    }
    this.state = this.files.length ? 'selected' : 'empty'; this.notice = 'sourcesChanged'; this.emit();
  }
  removeFile(sourceIndex) {
    if (!this.files.some(file => file.sourceIndex === sourceIndex)) return;
    this.setFiles(this.files.filter(file => file.sourceIndex !== sourceIndex).map(item => item.file));
  }
  start() {
    this.invalidate(); this.state = 'validating'; this.notice = 'running'; this.emit();
    const validation = validateSelection(this.files);
    if (!validation.ok) return this.fail(validation.errors[0].code, validation.errors[0].fileIndexes);
    const epoch = this.epoch, jobId = `job-${epoch}`;
    try {
      const worker = this.workerFactory(); this.worker = worker;
      worker.onmessage = event => {
        if (epoch !== this.epoch || this.worker !== worker) return;
        const message = event.data;
        if (!message || message.jobId !== jobId) return;
        if (message.type === 'progress') {
          const { stage, completedFiles, totalFiles } = message;
          if (!['hashing', 'verifying'].includes(stage) || !Number.isSafeInteger(completedFiles) || completedFiles < (this.progress?.completedFiles ?? 0)
            || totalFiles !== this.files.length || completedFiles > totalFiles || (this.state === 'verifying' && stage === 'hashing')) return;
          this.state = stage; this.progress = { stage, completedFiles, totalFiles }; this.emit();
        } else if (message.type === 'complete') {
          const result = message.result;
          if (result?.status !== 'ready' || result.jobId !== jobId || result.schemaVersion !== 1 || result.algorithm !== ALGORITHM
            || !Array.isArray(result.groups) || !Array.isArray(result.files) || result.files.length !== this.files.length
            || !result.summary || result.files.some((file, index) => file.sourceIndex !== index || file.name !== this.files[index].name || file.sizeBytes !== this.files[index].sizeBytes || !/^[0-9a-f]{64}$/.test(file.sha256))) return this.fail('VERIFY_FAILED', []);
          this.stopWorker(); this.result = result; this.state = 'ready'; this.progress = null; this.error = null; this.notice = 'ready'; this.emit();
        } else if (message.type === 'error') {
          this.fail(ERROR_CODES.includes(message.code) ? message.code : 'READ_FAILED', Array.isArray(message.fileIndexes) ? message.fileIndexes : []);
        }
      };
      worker.onerror = event => { event.preventDefault?.(); if (epoch === this.epoch && this.worker === worker) this.fail('READ_FAILED', []); };
      worker.onmessageerror = () => { if (epoch === this.epoch && this.worker === worker) this.fail('READ_FAILED', []); };
      this.state = 'hashing'; this.progress = { stage: 'hashing', completedFiles: 0, totalFiles: this.files.length }; this.emit();
      worker.postMessage({ type: 'start', jobId, files: this.files });
    } catch { this.fail('READ_FAILED', []); }
  }
  fail(code, indexes) {
    this.invalidate(); this.error = errorResult(`job-${this.epoch}`, code, indexes).error;
    this.state = this.files.length ? 'selected' : 'empty'; this.notice = 'error'; this.emit();
  }
  cancel() {
    this.state = 'cancelling'; this.emit(); this.invalidate();
    this.state = this.files.length ? 'selected' : 'empty'; this.notice = 'canceled'; this.emit();
  }
  selectKeeper(groupId, sourceIndex) {
    const next = chooseKeeper(this.result, groupId, sourceIndex);
    if (next === this.result) return false;
    this.revokeDownloads(); this.result = next; this.notice = 'keeperChanged'; this.emit(); return true;
  }
  download(format) {
    if (this.state !== 'ready' || !this.result || !['json', 'txt'].includes(format)) return null;
    if (!this.urls.has(format)) {
      const mime = format === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8';
      const content = format === 'json' ? serializeJSON(this.result) : serializeTXT(this.result);
      this.urls.set(format, { url: this.createURL(new Blob([content], { type: mime })), filename: `duplicate-report.${format}`, mime });
    }
    return this.urls.get(format);
  }
  reset() { this.invalidate(); this.files = []; this.state = 'empty'; this.notice = 'empty'; this.emit(); }
  pagehide() { this.reset(); }
}
