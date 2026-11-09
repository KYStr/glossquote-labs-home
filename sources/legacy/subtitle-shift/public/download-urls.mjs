// The adapters keep timer/object-URL state testable without using a browser.
export function createDownloadUrls({ now, setTimer, clearTimer, createBlob, createUrl, revokeUrl }) {
  const records = new Map();
  let nextToken = 0;
  const remove = record => {
    if (records.get(record.token) !== record) return;
    records.delete(record.token);
    clearTimer(record.timer);
    revokeUrl(record.url);
  };
  const prune = () => {
    const time = now();
    for (const record of records.values()) if (record.deadline <= time) remove(record);
  };
  const expire = record => {
    if (records.get(record.token) !== record) return;
    const remaining = record.deadline - now();
    if (remaining > 0) { record.timer = setTimer(() => expire(record), remaining); return; }
    remove(record);
  };
  return Object.freeze({
    allocate(text) {
      prune();
      if (records.size >= 8) return { ok: false, code: 'DOWNLOAD_CAPACITY' };
      let url;
      let record;
      try {
        const bytes = new TextEncoder().encode(text);
        const blob = createBlob(bytes, 'text/plain;charset=utf-8');
        url = createUrl(blob);
        record = { token: ++nextToken, url, deadline: now() + 30000, timer: null };
        records.set(record.token, record);
        record.timer = setTimer(() => expire(record), 30000);
        return { ok: true, url, token: record.token };
      } catch {
        if (record) records.delete(record.token);
        if (url !== undefined) revokeUrl(url);
        return { ok: false, code: 'DOWNLOAD_FAILED' };
      }
    },
    prune,
    clear() { for (const record of [...records.values()]) remove(record); },
    get size() { return records.size; }
  });
}
