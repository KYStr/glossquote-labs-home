export const probeArgs = (name) => {
  if (!['input.mp4', 'output.mp3'].includes(name)) throw new Error('MEDIA_UNSUPPORTED');
  return ['-v', 'error', '-show_entries', 'stream=index,codec_type,codec_name,codec_tag_string,channels,sample_rate,duration,bit_rate:format=duration', '-of', 'json', name, '-o', 'probe.json'];
};

// One wrapper Worker, one native probe, then termination. No C state or argv
// allocation survives into another probe, including after invalid input.
export class IsolatedProbe {
  #worker;
  #disposed = false;
  #onDispose;
  constructor(worker, onDispose = () => {}) { this.#worker = worker; this.#onDispose = onDispose; }
  get disposed() { return this.#disposed; }
  #requireLive() { if (this.#disposed) throw new Error('JOB_CANCELLED'); }
  async run({ loadOptions, bytes, name, timeout, missingInput = false }) {
    this.#requireLive();
    try {
      const args = probeArgs(name);
      if (!missingInput && !(bytes instanceof Uint8Array)) throw new Error('MEDIA_UNSUPPORTED');
      await this.#worker.load(loadOptions);
      this.#requireLive();
      if (!missingInput) {
        await this.#worker.writeFile(name, bytes);
        this.#requireLive();
      }
      const exit = await this.#worker.ffprobe(args, timeout);
      this.#requireLive();
      if (exit !== 0) {
        const error = new Error('MEDIA_UNSUPPORTED');
        error.probeExit = Number.isInteger(exit) ? exit : null;
        throw error;
      }
      const json = await this.#worker.readFile('probe.json', 'utf8');
      this.#requireLive();
      if (typeof json !== 'string' || new TextEncoder().encode(json).length > 65536) throw new Error('MEDIA_UNSUPPORTED');
      return JSON.parse(json);
    } catch (error) {
      if (this.#disposed || error?.message === 'JOB_CANCELLED') throw new Error('JOB_CANCELLED');
      const safe = new Error('MEDIA_UNSUPPORTED');
      if (Number.isInteger(error?.probeExit)) safe.probeExit = error.probeExit;
      throw safe;
    } finally { this.dispose(); }
  }
  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#worker.terminate();
    this.#worker = null;
    this.#onDispose();
  }
}
