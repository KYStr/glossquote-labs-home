import { calculateCutPlan, buildReport } from './core/cut-planner.mjs';

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

// Browser APIs enter only through adapters. Tests use offline, non-OS substitutes.
export function createSession(language, adapters, publish = () => {}) {
  let revision = 0, pageGeneration = 0, requestId = 0;
  let result = null, report = null, currentCopy = null, status = 'initial';
  const urls = new Map();
  const state = () => ({ revision, pageGeneration, result, report, status, copyBusy: currentCopy !== null, liveDownloads: urls.size });
  const emit = () => publish(state());
  const isCurrent = token => token.revision === revision && token.pageGeneration === pageGeneration && token.requestId === requestId;
  function invalidate(nextStatus) {
    revision++; requestId++; result = null; report = null; currentCopy = null; status = nextStatus;
  }
  function revokeAll() {
    for (const [url, item] of urls) { adapters.clearTimer(item.timer); adapters.revokeUrl(url); }
    urls.clear();
  }
  return {
    state,
    edit() { invalidate('stale'); emit(); },
    calculate(request) {
      invalidate('initial');
      const calculation = calculateCutPlan(request);
      if (!calculation.ok) { status = 'invalid'; emit(); return calculation; }
      const built = buildReport(calculation.result, language);
      if (!built.ok) { status = 'report-error'; emit(); return built; }
      result = freeze(calculation.result); report = freeze(built); status = 'ready'; emit();
      return { ok: true, result };
    },
    async copy() {
      if (!report || currentCopy) return false;
      const token = { revision, pageGeneration, requestId: ++requestId };
      const text = report.text;
      currentCopy = token; status = 'copying'; emit();
      try {
        await adapters.writeClipboard(text);
        if (isCurrent(token)) { status = 'copied'; emit(); }
      } catch {
        if (isCurrent(token)) { status = 'copy-denied'; emit(); }
      } finally {
        if (isCurrent(token)) { currentCopy = null; emit(); }
      }
      return true;
    },
    download() {
      if (!report) return false;
      if (urls.size >= 8) { status = 'download-limit'; emit(); return false; }
      let createdUrl = null;
      try {
        const blob = adapters.makeBlob([report.text], { type: report.mimeType });
        const url = adapters.createUrl(blob); createdUrl = url;
        const item = { timer: null };
        urls.set(url, item);
        item.timer = adapters.setTimer(() => {
          if (urls.get(url) !== item) return;
          adapters.revokeUrl(url); urls.delete(url); emit();
        }, 30000);
        adapters.download(url, report.filename);
        status = 'download-started'; emit(); return true;
      } catch {
        if (createdUrl !== null && urls.get(createdUrl)?.timer === null) {
          adapters.revokeUrl(createdUrl); urls.delete(createdUrl);
        }
        status = 'download-failed'; emit(); return false;
      }
    },
    reset() { invalidate('initial'); revokeAll(); emit(); },
    pagehide() { pageGeneration++; invalidate('initial'); revokeAll(); emit(); },
    restore() { pageGeneration++; invalidate('initial'); revokeAll(); emit(); }
  };
}
