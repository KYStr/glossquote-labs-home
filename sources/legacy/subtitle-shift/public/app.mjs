import { createController } from './controller.mjs';
import { createDownloadUrls } from './download-urls.mjs';
import { messages, describeError } from './messages.mjs';

const locale = document.documentElement.lang;
const copy = messages[locale];
const get = id => document.getElementById(id);
const input = get('srt-input');
const direction = get('direction');
const seconds = get('seconds');
const submit = get('shift');
const download = get('download');
const dialog = get('confirm');
const fields = { srtRaw: input, direction, secondsRaw: seconds };
let pending = null;
let origin = null;
const urls = createDownloadUrls({
  now: () => performance.now(), setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: id => clearTimeout(id),
  createBlob: (bytes, type) => new Blob([bytes], { type }),
  createUrl: blob => URL.createObjectURL(blob), revokeUrl: url => URL.revokeObjectURL(url)
});
const controller = createController({
  createWorker: () => {
    if (typeof Worker !== 'function') throw new Error('UNAVAILABLE');
    return new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });
  },
  setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: id => clearTimeout(id), urls,
  onChange: render
});
function render(state) {
  // Input values are owned by the browser while typing, including composition.
  // Only resetFields below writes them after an explicit reset/lifecycle event.
  const hasResult = state.result !== null && state.resultRevision === state.revision;
  submit.disabled = state.busy || state.composing;
  get('cancel-job').hidden = !state.busy;
  get('clear').disabled = state.composing;
  get('language').setAttribute('aria-disabled', String(state.composing));
  // Keep the live status outside an aria-busy ancestor so work is announced.
  submit.setAttribute('aria-busy', String(state.busy));
  get('status').textContent = state.status === 'success'
    ? copy.success(new Intl.NumberFormat(locale).format(state.result.cueCount))
    : (copy[state.status] ?? '');
  get('error').textContent = state.error ? describeError(locale, state.error) : '';
  get('error').hidden = !state.error;
  for (const [name, field] of Object.entries(fields)) field.setAttribute('aria-invalid', String(state.error?.field === name));
  get('result').hidden = !hasResult;
  get('srt-output').value = hasResult ? state.result.srtText : '';
  download.setAttribute('aria-disabled', String(!hasResult || state.composing || state.busy));
  download.tabIndex = hasResult ? 0 : -1;
  if (hasResult && !state.composing && !state.busy) download.setAttribute('href', '#');
  else download.removeAttribute('href');
  for (const [id, key] of [['first-input', 'firstInputCue'], ['first-output', 'firstOutputCue'], ['last-input', 'lastInputCue'], ['last-output', 'lastOutputCue']]) {
    get(id).textContent = hasResult ? copy.edge(state.result[key]) : '';
  }
}
function resetFields() {
  input.value = ''; direction.value = 'earlier'; seconds.value = '0';
}
function closeDialog(restore = true) {
  pending = null;
  if (dialog.open) dialog.close();
  const previous = origin; origin = null;
  if (restore && previous?.isConnected && !controller.snapshot().composing) previous.focus();
}
function ask(kind, trigger) {
  if (controller.snapshot().composing) return;
  if (!controller.hasContent()) { perform(kind); return; }
  pending = kind; origin = trigger;
  const clear = kind === 'clear';
  get('confirm-title').textContent = clear ? copy.confirmClearTitle : copy.confirmLanguageTitle;
  get('confirm-body').textContent = clear ? copy.confirmClearBody : copy.confirmLanguageBody;
  get('confirm-continue').textContent = clear ? copy.confirmClearAction : copy.confirmLanguageAction;
  dialog.showModal(); get('confirm-cancel').focus();
}
function perform(kind) {
  if (kind === 'clear') { controller.clear(); resetFields(); }
  else { controller.navigate(); resetFields(); location.assign(get('language').getAttribute('href')); }
}
for (const [name, field] of Object.entries(fields)) {
  field.addEventListener('input', event => controller.edit(name, field.value, event.isComposing));
  if (name === 'direction') field.addEventListener('change', () => controller.edit(name, field.value));
  else {
    field.addEventListener('compositionstart', () => controller.compositionStart());
    field.addEventListener('compositionend', () => controller.compositionEnd(name, field.value));
  }
}
submit.addEventListener('click', () => controller.submit());
get('cancel-job').addEventListener('click', () => controller.cancel());
get('clear').addEventListener('click', event => ask('clear', event.currentTarget));
get('language').addEventListener('click', event => { event.preventDefault(); ask('language', event.currentTarget); });
download.addEventListener('click', event => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) { event.preventDefault(); return; }
  const outcome = controller.download();
  if (!outcome.ok) { event.preventDefault(); return; }
  // Keep the native default action of this explicit user click; no synthetic click.
  download.setAttribute('href', outcome.url);
});
get('confirm-cancel').addEventListener('click', () => closeDialog());
get('confirm-continue').addEventListener('click', () => { const kind = pending; closeDialog(kind === 'clear'); if (kind) perform(kind); });
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const first = get('confirm-cancel'); const last = get('confirm-continue');
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
window.addEventListener('pagehide', () => { closeDialog(false); controller.pagehide(); resetFields(); });
window.addEventListener('pageshow', event => {
  if (event.persisted) { closeDialog(false); resetFields(); }
  controller.pageshow(event.persisted);
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') controller.resume(); });
resetFields();
for (const field of Object.values(fields)) field.disabled = false;
get('clear').disabled = false;
render(controller.snapshot());
