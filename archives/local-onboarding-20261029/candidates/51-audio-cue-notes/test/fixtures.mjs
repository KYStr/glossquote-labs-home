export const one = (text = 'Key point', timeMs = 12345, noteId = 'note-000001') => ({ noteId, timeMs, text });
export const result = (notes = [one()], durationMs = 3_723_004, sourceTitle = 'Interview recording') => ({
  schemaVersion: 1, kind: 'glossquote-audio-cue-notes', sourceTitle, durationMs, notes
});
export const encode = value => new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value));
export const fileOf = bytes => ({ size: bytes.byteLength, arrayBuffer: async () => bytes.slice().buffer });
export const many = (count, text = 'x') => Array.from({ length: count }, (_, i) => one(text, 0, `note-${String(i + 1).padStart(6, '0')}`));
export function exactExportResult() {
  const notes = many(700, '\u0001');
  for (let i = 0; i < 689; i += 1) notes[i].text = '\u0001'.repeat(1000);
  notes[689].text = '\u0001'.repeat(683);
  notes[699].text += 'abcde';
  return result(notes, 0);
}
export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export class FakeAudio {
  constructor() {
    this.src = '';
    this.currentTime = 0;
    this.duration = 123.4569;
    this.readyState = 0;
    this.paused = true;
    this.listeners = new Map();
    this.calls = [];
    this.support = 'maybe';
  }
  canPlayType() { return this.support; }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  emit(type) { for (const handler of [...(this.listeners.get(type) ?? [])]) handler(); }
  pause() { this.calls.push('pause'); this.paused = true; }
  play() { this.calls.push('play'); this.paused = false; return Promise.resolve(); }
  load() { this.calls.push('load'); }
  removeAttribute(name) { this.calls.push(`remove:${name}`); this.src = ''; this.currentTime = 0; this.readyState = 0; }
  metadata(seconds = 123.4569) { this.duration = seconds; this.readyState = 1; this.emit('loadedmetadata'); }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}

export function fakeUrls() {
  let serial = 0;
  return {
    created: [], revoked: [],
    createObjectURL(object) { const url = `blob:synthetic-${++serial}`; this.created.push({ object, url }); return url; },
    revokeObjectURL(url) { this.revoked.push(url); }
  };
}
export const audioFile = (size = 8, name = 'synthetic.wav', type = 'audio/wav') => ({ size, name, type });
