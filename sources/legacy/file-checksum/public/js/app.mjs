import { ChecksumController } from './controller.mjs';
import { isBusy } from './core/session.mjs';
import { getLocale } from './i18n.mjs';

export const MILESTONE = 'T02';
function text(element, value) { if (element.textContent !== value) element.textContent = value; }
export function mountChecksumApp(document, environment = globalThis) {
  const ids = ['file', 'expected', 'calculate', 'cancel', 'clear', 'copy', 'download', 'checksum', 'status', 'comparison',
    'file-meta', 'file-name', 'full-name', 'file-size', 'name-details', 'expected-error', 'support-notice', 'output-status', 'startup-notice'];
  const elements = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  if (Object.values(elements).some(element => element === null)) throw new Error('WORKER_PROTOCOL');
  const locale = getLocale(document.documentElement.lang);
  let lastFileRevision = -1;
  const controller = new ChecksumController({ environment,
    resetInputs() { elements.file.value = ''; elements.expected.value = ''; elements['name-details'].open = false; },
    focus(id) { elements[id].focus(); },
    copyFallback() { elements.checksum.focus(); elements.checksum.select(); },
    requestDownload(url, filename) {
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = filename; anchor.hidden = true;
      document.body.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
    },
    onChange(view) {
      const state = view.state;
      const busy = isBusy(state);
      elements.file.disabled = false;
      elements.expected.disabled = false;
      elements.clear.disabled = false;
      elements.calculate.disabled = busy || state.fileSize === null || !view.supported;
      elements.calculate.setAttribute('aria-busy', String(busy));
      elements.cancel.disabled = !busy;
      elements.copy.disabled = state.hash === null;
      elements.download.disabled = state.hash === null;
      elements.checksum.disabled = state.hash === null;
      if (elements.checksum.value !== (state.hash ?? '')) elements.checksum.value = state.hash ?? '';
      text(elements.status, state.phase === 'error' ? locale.errors[state.error] ?? locale.errors.WORKER_PROTOCOL : locale.phases[state.phase]);
      text(elements.comparison, locale.comparisons[state.comparison]);
      elements.comparison.dataset.state = state.comparison;
      const expectedError = state.expected.state === 'invalid' ? locale.errors[state.expected.code] : '';
      text(elements['expected-error'], expectedError);
      elements.expected.setAttribute('aria-invalid', String(state.expected.state === 'invalid'));
      elements['support-notice'].hidden = view.environmentError === null;
      text(elements['support-notice'], view.environmentError === null ? '' : locale.errors[view.environmentError]);
      text(elements['output-status'], locale.output[view.outputStatus]);
      elements['file-meta'].hidden = !view.hasFile;
      text(elements['file-name'], view.fileName);
      text(elements['full-name'], view.fileName);
      if (state.fileSize !== null) {
        const bytes = new Intl.NumberFormat(document.documentElement.lang).format(state.fileSize);
        const mib = new Intl.NumberFormat(document.documentElement.lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(state.fileSize / 1048576);
        text(elements['file-size'], locale.size(bytes, mib));
      } else text(elements['file-size'], '');
      if (lastFileRevision !== state.fileRevision) elements['name-details'].open = false;
      lastFileRevision = state.fileRevision;
    },
  });
  elements.file.addEventListener('change', () => {
    if (elements.file.files?.length === 1) controller.selectFile(elements.file.files[0]);
  });
  elements.expected.addEventListener('input', () => controller.setExpected(elements.expected.value));
  elements.calculate.addEventListener('click', () => controller.start());
  elements.cancel.addEventListener('click', () => controller.cancel());
  elements.clear.addEventListener('click', () => controller.clear());
  elements.copy.addEventListener('click', () => { void controller.copy(); });
  elements.download.addEventListener('click', () => controller.download());
  environment.addEventListener('pagehide', () => controller.clear({ pagehide: true }));
  environment.addEventListener('pageshow', event => {
    if (event.persisted) controller.clear({ pagehide: true });
    else controller.checkDeadline();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') controller.checkDeadline();
  });
  elements['startup-notice'].hidden = true;
  document.documentElement.dataset.preview = MILESTONE;
  controller.refresh();
  return controller;
}
export const controller = typeof document === 'undefined' ? null : mountChecksumApp(document);
