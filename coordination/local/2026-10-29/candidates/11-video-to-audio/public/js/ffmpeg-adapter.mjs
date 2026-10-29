import { validateManifest } from './core/manifest.mjs';
import { IsolatedProbe, probeArgs } from './core/isolated-probe.mjs';

const fixedError = (code) => new Error(code);
const hex = (bytes) => Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('');
export class FFmpegAdapter {
  #ffmpeg = null;
  #wasmURL = null;
  #abort = null;
  #disposed = false;
  #terminationCount = 0;
  #probe = null;
  #probeTerminationCount = 0;
  #probing = false;
  #cache = 'force-cache';
  get disposed() { return this.#disposed; }
  get terminationCount() { return this.#terminationCount; }
  get probeWorkerTerminationCount() { return this.#probeTerminationCount; }

  async load(value, { signal, onDownload = () => {}, onPhase = () => {}, downloadTimeout = 120000, initTimeout = 60000 } = {}) {
    const manifest = validateManifest(value);
    if (typeof Worker !== 'function' || typeof WebAssembly !== 'object' || !crypto.subtle) throw fixedError('BROWSER_UNSUPPORTED');
    if (this.#disposed || this.#ffmpeg) throw fixedError('RUNTIME_LOAD_FAILED');
    const abort = new AbortController(); this.#abort = abort;
    const cancelled = () => { abort.abort(); this.dispose(); };
    signal?.addEventListener('abort', cancelled, { once: true });
    if (signal?.aborted) { cancelled(); throw fixedError('JOB_CANCELLED'); }
    let received = 0, wasmBytes;
    let timedOut = false;
    const downloadTimer = setTimeout(() => { timedOut = true; abort.abort(); this.dispose(); }, downloadTimeout);
    onPhase('downloading');
    try {
      for (const file of manifest.files) {
        const response = await fetch(file.path, { signal: abort.signal, credentials: 'omit', cache: this.#cache, redirect: 'error' });
        if (!response.ok || response.headers.get('Content-Type')?.split(';')[0].trim() !== file.mime) throw fixedError('RUNTIME_LOAD_FAILED');
        const declared = response.headers.get('Content-Length');
        if (declared !== null && Number(declared) !== file.bytes) throw fixedError('RUNTIME_INTEGRITY_FAILED');
        const reader = response.body.getReader();
        const chunks = []; let size = 0;
        try {
          for (;;) {
            const { value: chunk, done } = await reader.read();
            if (done) break;
            size += chunk.length;
            if (size > file.bytes) throw fixedError('RUNTIME_INTEGRITY_FAILED');
            chunks.push(chunk); received += chunk.length;
            onDownload({ received, total: manifest.totalBytes });
          }
        } finally { reader.releaseLock(); }
        if (size !== file.bytes) throw fixedError('RUNTIME_INTEGRITY_FAILED');
        const bytes = new Uint8Array(size); let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        if (hex(await crypto.subtle.digest('SHA-256', bytes)) !== file.sha256) throw fixedError('RUNTIME_INTEGRITY_FAILED');
        if (file.mime === 'application/wasm') wasmBytes = bytes;
      }
      if (abort.signal.aborted || this.#disposed) throw fixedError('JOB_CANCELLED');
      clearTimeout(downloadTimer);
      onPhase('initializing');
      this.#wasmURL = URL.createObjectURL(new Blob([wasmBytes], { type: 'application/wasm' }));
      wasmBytes = null;
      await this.bounded(async () => {
        const { FFmpeg } = await import('../vendor/ffmpeg/ffmpeg-0.12.15/index.js');
        if (abort.signal.aborted || this.#disposed) throw fixedError('JOB_CANCELLED');
        this.#ffmpeg = new FFmpeg();
        return this.#ffmpeg.load({
          classWorkerURL: '/vendor/ffmpeg/ffmpeg-0.12.15/worker.js',
          coreURL: '/vendor/ffmpeg/core-0.12.10/ffmpeg-core.js',
          wasmURL: this.#wasmURL,
        });
      }, initTimeout);
    } catch (error) {
      this.dispose();
      if (timedOut || error?.message === 'JOB_TIMEOUT') throw fixedError('JOB_TIMEOUT');
      if (signal?.aborted || error?.message === 'JOB_CANCELLED') throw fixedError('JOB_CANCELLED');
      if (error?.message === 'RUNTIME_INTEGRITY_FAILED') throw error;
      throw fixedError('RUNTIME_LOAD_FAILED');
    } finally {
      clearTimeout(downloadTimer);
      signal?.removeEventListener('abort', cancelled);
      this.#abort = null;
    }
  }
  async bounded(action, timeout) {
    if (this.#disposed) throw fixedError('JOB_CANCELLED');
    let timer;
    try {
      return await Promise.race([Promise.resolve().then(action), new Promise((_, reject) => {
        timer = setTimeout(() => { this.dispose(); reject(fixedError('JOB_TIMEOUT')); }, timeout);
      })]);
    } finally { clearTimeout(timer); }
  }
  async write(bytes) {
    if (!this.#ffmpeg || this.#disposed) throw fixedError('RUNTIME_LOAD_FAILED');
    await this.#ffmpeg.writeFile('input.mp4', bytes);
  }
  async probe(name = 'input.mp4', { timeout = 15000 } = {}) {
    if (!['input.mp4', 'output.mp3'].includes(name)) throw fixedError('MEDIA_UNSUPPORTED');
    return this.#isolatedProbe(name, { timeout });
  }
  async #isolatedProbe(name, { timeout, missingInput = false }) {
    if (!this.#ffmpeg || this.#disposed || this.#probing) throw fixedError('MEDIA_UNSUPPORTED');
    this.#probing = true;
    try {
      return await this.bounded(async () => {
        let bytes;
        try { if (!missingInput) bytes = await this.#ffmpeg.readFile(name); }
        catch { throw fixedError('MEDIA_UNSUPPORTED'); }
        const { FFmpeg } = await import('../vendor/ffmpeg/ffmpeg-0.12.15/index.js');
        if (this.#disposed) throw fixedError('JOB_CANCELLED');
        const probe = new IsolatedProbe(new FFmpeg(), () => { this.#probeTerminationCount++; });
        this.#probe = probe;
        try {
          return await probe.run({
            loadOptions: { classWorkerURL: '/vendor/ffmpeg/ffmpeg-0.12.15/worker.js', coreURL: '/js/core/ffprobe-core.mjs', wasmURL: this.#wasmURL },
            bytes, name, timeout, missingInput,
          });
        } finally { if (this.#probe === probe) this.#probe = null; }
      }, timeout);
    } finally { this.#probing = false; }
  }
  async convert({ timeout = 180000 } = {}) {
    return this.bounded(async () => {
      const exit = await this.#ffmpeg.exec(['-i', 'input.mp4', '-map', '0:a:0', '-vn', '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-ac', '2', '-map_metadata', '-1', '-map_chapters', '-1', 'output.mp3'], timeout);
      if (exit !== 0) throw fixedError('CONVERT_FAILED');
      return exit;
    }, timeout);
  }
  async readOutput() {
    const output = await this.#ffmpeg.readFile('output.mp3');
    if (!(output instanceof Uint8Array) || output.length === 0 || output.length > 4 * 1024 * 1024) throw fixedError('OUTPUT_INVALID');
    return output;
  }
  async cleanup() {
    if (this.#disposed || !this.#ffmpeg) return;
    for (const name of ['input.mp4', 'output.mp3', 'probe.json', 'reference.f32', 'actual.f32']) {
      if (this.#disposed) return;
      await this.#ffmpeg.deleteFile(name).catch(() => {});
    }
  }
  // Spike-only access. Not exposed by the product UI; fixed synthetic commands are in test/spike.
  async spikeLoadUncached(value, options) {
    this.#cache = 'reload';
    try { return await this.load(value, options); }
    finally { this.#cache = 'force-cache'; }
  }
  async spikeBuildInfo() {
    const info = { ffmpegVersion: null, enableGPL: false, libx264: false, libmp3lame: false, singleThread: false };
    const inspect = ({ message }) => {
      const version = /^ffmpeg version (\S+)/.exec(message);
      if (version) info.ffmpegVersion = version[1];
      if (message.startsWith('configuration:')) {
        info.enableGPL = message.includes('--enable-gpl');
        info.libx264 = message.includes('--enable-libx264');
        info.libmp3lame = message.includes('--enable-libmp3lame');
        info.singleThread = message.includes('--disable-pthreads');
      }
    };
    this.#ffmpeg.on('log', inspect);
    try { info.exit = await this.#ffmpeg.exec(['-version']); return info; }
    finally { this.#ffmpeg.off('log', inspect); }
  }
  async spikeExec(args, timeout = 180000) { return this.bounded(() => this.#ffmpeg.exec(args, timeout), timeout); }
  // Diagnosis only: preserve the official binding's original numeric failure.
  async spikeOriginalProbeExit() { return this.bounded(() => this.#ffmpeg.ffprobe(probeArgs('input.mp4'), 15000), 15000); }
  // Diagnosis only: ask native ffprobe to reject a nonexistent fixed filename.
  async spikeMissingProbe() { return this.#isolatedProbe('input.mp4', { timeout: 15000, missingInput: true }); }
  async spikeRead(name) { return this.#ffmpeg.readFile(name); }
  async spikeDelete(name) { return this.#ffmpeg.deleteFile(name).catch(() => {}); }
  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#abort?.abort();
    this.#probe?.dispose();
    this.#probe = null;
    if (this.#ffmpeg) { this.#ffmpeg.terminate(); this.#terminationCount++; }
    this.#ffmpeg = null;
    if (this.#wasmURL) URL.revokeObjectURL(this.#wasmURL);
    this.#wasmURL = null;
  }
}
