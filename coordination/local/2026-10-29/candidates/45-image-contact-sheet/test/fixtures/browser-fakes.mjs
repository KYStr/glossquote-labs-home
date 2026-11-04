// These record calls only. They never decode pixels or produce a PNG.
export const fakePngBlob = () => new Blob(['LIFECYCLE TEST FAKE; NOT PNG BYTES'], { type: 'image/png' });
export function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
export const tick = () => new Promise((resolve) => setImmediate(resolve));
export class FakeCanvas {
  constructor({ deferEncode = false, blob = fakePngBlob(), nullContext = false, throwDraw = false, throwEncode = false } = {}) {
    this.width = 0; this.height = 0; this.draws = []; this.labels = []; this.fills = []; this.calls = [];
    this.deferEncode = deferEncode; this.blob = blob; this.nullContext = nullContext;
    this.throwDraw = throwDraw; this.throwEncode = throwEncode; this.encodes = 0;
    this.context = {
      fillRect: (...args) => this.fills.push({ color: this.context.fillStyle, args }),
      drawImage: (...args) => { if (this.throwDraw) throw new Error('synthetic draw failure'); this.draws.push(args); },
      strokeRect: (...args) => this.calls.push(['stroke', ...args]),
      fillText: (...args) => this.labels.push(args), measureText: (s) => ({ width: Array.from(s).length * 12 }),
      save: () => {}, restore: () => {}, beginPath: () => {}, rect: () => {}, clip: () => {},
    };
  }
  getContext(type, options) { this.calls.push(['context', type, options]); return this.nullContext ? null : this.context; }
  toBlob(callback, type) {
    this.encodes++; this.calls.push(['encode', type]);
    if (this.throwEncode) throw new Error('synthetic encode failure');
    if (this.deferEncode) this.callback = callback;
    else callback(this.blob);
  }
}
export function bitmap(id = 'fake', width = 300, height = 200, closed = () => {}) {
  return { id, width, height, closes: 0, close() { this.closes++; closed(); } };
}
export function lifecycleItems(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    file: { name: String.fromCharCode(65 + i) + '.png', size: 20 },
    metadata: { format: 'png', rawWidth: 300, rawHeight: 200, visualWidth: 300, visualHeight: 200, orientation: 1, animated: false },
  }));
}
export function fakeUrls() {
  const created = [], revoked = [], timers = new Map();
  let next = 0;
  return { created, revoked, timers, config: {
    create(blob) { const url = `blob:fake-${++next}`; created.push({ url, blob }); return url; },
    revoke: (url) => revoked.push(url),
    timer(callback, ms) { if (ms !== 60_000) throw new Error('timeout is not 60s'); const id = ++next; timers.set(id, callback); return id; },
    untimer: (id) => timers.delete(id),
  } };
}
