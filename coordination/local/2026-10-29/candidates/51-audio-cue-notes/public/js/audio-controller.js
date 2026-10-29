import { MAX_AUDIO_BYTES, durationToMs, captureTimeMs } from './core/notes.js';

export function validateAudioFile(file) {
  return file && Number.isSafeInteger(file.size) && file.size >= 0 && file.size <= MAX_AUDIO_BYTES
    ? { ok: true } : { error: 'AUDIO_TOO_LARGE' };
}

// The media element and object-URL API are injected for offline lifecycle tests.
// Those tests cannot establish browser playback or codec support.
export class AudioController {
  constructor(audio, hooks = {}, urls = URL) {
    this.audio = audio;
    this.hooks = hooks;
    this.urls = urls;
    this.file = null;
    this.url = null;
    this.durationMs = null;
    this.epoch = 0;
    this.handlers = [];
    audio.preload = 'metadata';
    audio.autoplay = false;
  }

  load(file) {
    const validation = validateAudioFile(file);
    if (validation.error) return validation;
    this.release();
    // File MIME and canPlayType() are hints, never a gate on actual decoding.
    // Attempt metadata loading even when the browser does not recognize the hint.
    const epoch = this.epoch;
    const audio = this.audio;
    this.file = file;
    try { this.url = this.urls.createObjectURL(file); }
    catch { this.release(); return { error: 'AUDIO_UNSUPPORTED' }; }
    const url = this.url;
    const current = () => this.epoch === epoch && this.url === url && audio.src === url;
    const listen = (type, handler) => {
      const guarded = () => { if (current()) handler(); };
      this.handlers.push([type, guarded]);
      audio.addEventListener(type, guarded);
    };
    const fail = code => {
      this.release();
      this.hooks.onError?.(code);
    };
    const metadata = () => {
      const ms = durationToMs(audio.duration);
      if (typeof ms !== 'number') return fail('AUDIO_DURATION');
      const first = this.durationMs === null;
      this.durationMs = ms;
      this.hooks.onReady?.(ms, first);
    };
    listen('loadedmetadata', metadata);
    listen('durationchange', () => { if (audio.readyState >= 1) metadata(); });
    listen('error', () => fail('AUDIO_UNSUPPORTED'));
    listen('abort', () => fail('AUDIO_ABORTED'));
    // load() may emit an initial emptied while switching resources. Once metadata
    // exists an unexpected empty resource is a failure, not an available source.
    listen('emptied', () => { if (this.durationMs !== null) fail('AUDIO_ABORTED'); });
    listen('timeupdate', () => this.hooks.onTime?.());
    listen('play', () => this.hooks.onPlayback?.('playing'));
    listen('pause', () => this.hooks.onPlayback?.('paused'));
    listen('ended', () => this.hooks.onPlayback?.('paused'));
    try { audio.src = url; audio.load(); }
    catch { fail('AUDIO_UNSUPPORTED'); return { error: 'AUDIO_UNSUPPORTED' }; }
    return { ok: true };
  }

  currentTimeMs() {
    return this.durationMs === null ? { error: 'invalid-time' }
      : captureTimeMs(this.audio.currentTime, this.durationMs);
  }

  seek(timeMs) {
    if (this.durationMs === null || !Number.isSafeInteger(timeMs) || timeMs < 0 || timeMs > this.durationMs) {
      return { error: 'SEEK_RANGE' };
    }
    try { this.audio.currentTime = timeMs / 1000; }
    catch { return { error: 'SEEK_RANGE' }; }
    // Seeking deliberately does not call play().
    return { ok: true };
  }

  release() {
    this.epoch += 1;
    for (const [type, handler] of this.handlers) this.audio.removeEventListener(type, handler);
    this.handlers = [];
    const url = this.url;
    this.url = null;
    this.file = null;
    this.durationMs = null;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    if (url) this.urls.revokeObjectURL(url);
  }
}
