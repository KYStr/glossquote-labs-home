// Isolated browser effects: no access to inputs, storage or network.
export function createEffects({ clipboard, createURL, revokeURL, setTimer, clearTimer, now, onChange }) {
  let revision = 0, generation = 0, requestId = 0;
  let copyState = 'idle';
  let urls = new Map();
  const publish = () => onChange({ copyState, activeDownloads: urls.size });
  const current = token => token.revision === revision && token.generation === generation && token.requestId === requestId;
  function invalidate() {
    revision++; requestId++; copyState = 'idle'; publish();
  }
  function reset() {
    generation++; invalidate();
    for (const [url, { timer }] of urls) { clearTimer(timer); revokeURL(url); }
    urls.clear(); publish();
  }
  async function copy(text) {
    const token = { revision, generation, requestId: ++requestId };
    copyState = 'pending'; publish();
    try {
      if (!clipboard || typeof clipboard.writeText !== 'function') throw new Error('unavailable');
      await clipboard.writeText(text);
      if (current(token)) { copyState = 'success'; publish(); }
    } catch {
      if (current(token)) { copyState = 'failed'; publish(); }
    } finally {
      // A stale completion cannot clear another request's pending state.
      if (current(token)) publish();
    }
  }
  function download(blob) {
    if (urls.size >= 8) return { ok: false, code: 'capacity' };
    let url;
    try {
      url = createURL(blob);
      const deadline = now() + 30000;
      const timer = setTimer(() => {
        if (!urls.has(url)) return;
        revokeURL(url); urls.delete(url); publish();
      }, 30000);
      urls.set(url, { deadline, timer }); publish();
      return { ok: true, url };
    } catch {
      if (url) revokeURL(url);
      return { ok: false, code: 'unavailable' };
    }
  }
  return { invalidate, reset, copy, download, snapshot: () => ({ revision, generation, requestId, copyState, activeDownloads: urls.size, deadlines: [...urls.values()].map(entry => entry.deadline) }) };
}
