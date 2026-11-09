export function createRosterState({ setTimer = setTimeout, clearTimer = clearTimeout, revokeURL = url => URL.revokeObjectURL(url) } = {}) {
  let revision = 0;
  let requestId = 0;
  let pageGeneration = 0;
  let result = null;
  let copyEpoch = 0;
  let copyPromise = null;
  const urls = new Map();
  const snapshot = () => ({ revision, requestId, pageGeneration, result, copyEpoch, copyPending: copyPromise !== null, activeDownloads: urls.size });
  const invalidateCopy = () => { copyEpoch++; copyPromise = null; };
  const edit = () => { revision++; result = null; invalidateCopy(); };
  const releaseURL = url => {
    const timer = urls.get(url);
    if (!urls.has(url)) return;
    urls.delete(url);
    try { clearTimer(timer); } catch { /* Continue revoking every tracked URL. */ }
    try { revokeURL(url); } catch { /* Native revocation is best effort. */ }
  };
  const reset = () => { edit(); pageGeneration++; for (const url of urls.keys()) releaseURL(url); };
  const accept = (value, expectedRevision) => {
    if (expectedRevision !== revision || !value?.ok) return false;
    invalidateCopy(); requestId++; result = value; return true;
  };
  function copy(writeText, text, notify) {
    if (!result || copyPromise !== null) return false;
    copyEpoch++;
    const token = { revision, requestId, pageGeneration, copyEpoch, result };
    const current = () => token.revision === revision && token.requestId === requestId && token.pageGeneration === pageGeneration && token.copyEpoch === copyEpoch && token.result === result;
    notify('copying');
    let promise;
    try { promise = Promise.resolve(writeText(text)); copyPromise = promise; }
    catch { if (current()) { notify('failed'); notify('settled'); } return true; }
    promise.then(
      () => { if (current() && copyPromise === promise) notify('copied'); },
      () => { if (current() && copyPromise === promise) notify('failed'); },
    ).finally(() => { if (current() && copyPromise === promise) { copyPromise = null; notify('settled'); } }).catch(() => {});
    return true;
  }
  function download(makeURL, trigger) {
    if (!result) return { ok: false, code: 'NO_RESULT' };
    if (urls.size >= 8) return { ok: false, code: 'DOWNLOAD_LIMIT' };
    let url;
    try {
      url = makeURL();
      if (urls.has(url)) return { ok: false, code: 'DOWNLOAD_FAILED' };
      // Register ownership before scheduling or handing off to the browser.
      urls.set(url, null);
      const timer = setTimer(() => releaseURL(url), 30000);
      urls.set(url, timer);
      trigger(url);
      return { ok: true };
    } catch { if (url !== undefined) releaseURL(url); return { ok: false, code: 'DOWNLOAD_FAILED' }; }
  }
  return { snapshot, edit, reset, accept, copy, download };
}
