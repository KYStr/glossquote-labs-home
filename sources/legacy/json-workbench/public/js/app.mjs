import { initialSession, transition } from './core/session.mjs';
import { locate, LIMITS, failure } from './core/lexer.mjs';
import { createExporter } from './core/export.mjs';
import { WORKER_SOURCE } from './worker-source.mjs';
import { locales } from './locales.mjs';
import { currentErrorOffset } from './core/error-location.mjs';
const locale = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
const messages = locales[locale];
const numberFormat = new Intl.NumberFormat(locale,{useGrouping:false});

const source = document.querySelector('#source');
const output = document.querySelector('#output');
const run = document.querySelector('#run');
const cancel = document.querySelector('#cancel');
const clear = document.querySelector('#clear');
const copy = document.querySelector('#copy');
const download = document.querySelector('#download');
const status = document.querySelector('#status');
const exportStatus = document.querySelector('#export-status');
const errorActions = document.querySelector('#error-actions');
const goToError = document.querySelector('#go-to-error');
const radios = [...document.querySelectorAll('input[name="mode"]')];
let session = initialSession();
let worker = null;
let workerURL = null;
let watchdog = null;
let copying = false;
const exporter = createExporter({
  clipboard:navigator.clipboard,
  triggerDownload:(url,name) => {
    const link = document.createElement('a');
    link.href = url; link.download = name;
    document.body.append(link); link.click(); link.remove();
  },
});

function stopWork() {
  if (worker) worker.terminate();
  worker = null;
  if (workerURL !== null) URL.revokeObjectURL(workerURL);
  workerURL = null;
  if (watchdog !== null) clearTimeout(watchdog);
  watchdog = null;
}
function render() {
  const errorOffset = currentErrorOffset(session,source.value);
  errorActions.hidden = errorOffset === null;
  goToError.disabled = errorOffset === null;
  goToError.textContent = messages.goToError;
  output.value = session.text;
  run.disabled = session.status === 'running';
  run.textContent = session.status === 'running' ? messages.busy : messages.check;
  cancel.disabled = session.status !== 'running';
  copy.disabled = session.status !== 'success' || copying;
  download.disabled = session.status !== 'success';
  radios.forEach(radio => { radio.checked = radio.value === session.mode; });
  source.setAttribute('aria-invalid',String(errorOffset !== null));
  status.dataset.state = session.status;
  if (session.error) {
    let text = `! ${messages[session.error.code]}`;
    if (errorOffset !== null) {
      const position = locate(session.source,errorOffset);
      text += messages.position.replace('{line}',numberFormat.format(position.line)).replace('{column}',numberFormat.format(position.column)).replace('{offset}',numberFormat.format(errorOffset));
    }
    status.textContent = text;
  } else {
    status.textContent = session.reason === 'cancelled' ? messages.cancelled : messages[session.status];
  }
}
function update(event) {
  if (event.type !== 'RESULT') exporter.release();
  exportStatus.textContent = '';
  session = transition(session,event); render();
}
function complete(jobId,result) {
  if (session.status !== 'running' || jobId !== session.jobId) return;
  stopWork();
  update({type:'RESULT',jobId,result});
}
function revealErrorCaret(offset) {
  // wrap="off" keeps each newline-delimited line at the computed line height.
  const style = getComputedStyle(source);
  const lineHeight = Number.parseFloat(style.lineHeight);
  const top = Number.parseFloat(style.paddingTop) + (locate(source.value,offset).line - 1) * lineHeight;
  if (Number.isFinite(top) && (top < source.scrollTop || top + lineHeight > source.scrollTop + source.clientHeight)) source.scrollTop = Math.max(0,top - (source.clientHeight - lineHeight) / 2);
  // Measure the current line locally; nothing is drawn or added to the DOM.
  const context = document.createElement('canvas').getContext('2d');
  if (context) {
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const prefix = source.value.slice(source.value.lastIndexOf('\n',offset - 1) + 1,offset);
    const tabWidth = context.measureText(' ').width * Number.parseFloat(style.tabSize);
    let width = 0;
    prefix.split('\t').forEach((part,index) => {
      if (index && tabWidth > 0) width = (Math.floor(width / tabWidth) + 1) * tabWidth;
      if (part.length) width += context.measureText(part).width;
    });
    const left = Number.parseFloat(style.paddingLeft) + width;
    const rightPadding = Number.parseFloat(style.paddingRight);
    if (left < source.scrollLeft || left + rightPadding > source.scrollLeft + source.clientWidth) source.scrollLeft = Math.max(0,left - source.clientWidth / 2);
  }
  source.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
}
source.addEventListener('input',() => { stopWork(); update({type:'SOURCE',source:source.value}); });
goToError.addEventListener('click',() => {
  const offset = currentErrorOffset(session,source.value);
  if (offset === null) return;
  source.focus();
  source.setSelectionRange(offset,offset);
  revealErrorCaret(offset);
});
radios.forEach(radio => radio.addEventListener('change',() => { stopWork(); update({type:'MODE',mode:radio.value}); }));
cancel.addEventListener('click',() => { stopWork(); update({type:'CANCEL'}); });
clear.addEventListener('click',() => { stopWork(); source.value = ''; update({type:'CLEAR'}); source.focus(); });
run.addEventListener('click',() => {
  stopWork(); update({type:'START'});
  const jobId = session.jobId;
  if (typeof Worker !== 'function' || typeof TextEncoder !== 'function' || typeof Blob !== 'function' || typeof URL.createObjectURL !== 'function') return complete(jobId,failure('UNSUPPORTED'));
  if (session.source.length > LIMITS.inputBytes || new TextEncoder().encode(session.source).byteLength > LIMITS.inputBytes) return complete(jobId,failure('INPUT_TOO_LARGE'));
  try {
    workerURL = URL.createObjectURL(new Blob([WORKER_SOURCE],{type:'text/javascript'}));
    worker = new Worker(workerURL,{type:'module'});
    worker.onmessage = event => {
      const data = event.data;
      if (!data || data.type !== 'result' || data.jobId !== jobId) return;
      if (Object.keys(data).length !== 3) return complete(jobId,failure('WORKER_FAILED'));
      complete(jobId,data.result);
    };
    worker.onerror = event => { event.preventDefault(); complete(jobId,failure('WORKER_FAILED')); };
    worker.onmessageerror = () => complete(jobId,failure('WORKER_FAILED'));
    watchdog = setTimeout(() => complete(jobId,failure('TIMEOUT')),5000);
    worker.postMessage({type:'process',jobId,source:session.source,mode:session.mode});
  } catch { complete(jobId,failure('WORKER_FAILED')); }
});
copy.addEventListener('click',async () => {
  if (session.status !== 'success' || copying) return;
  const jobId = session.jobId;
  copying = true; render();
  const copied = await exporter.copy(session.text);
  copying = false; render();
  if (jobId !== session.jobId || session.status !== 'success') return;
  exportStatus.textContent = copied ? messages.copied : messages.copyFailed;
  if (!copied) { output.focus(); output.select(); }
});
download.addEventListener('click',() => {
  if (session.status !== 'success') return;
  const result = exporter.download(session.text);
  exportStatus.textContent = result.ok ? messages.downloaded : messages.downloadFailed;
});
window.addEventListener('pagehide',() => { stopWork(); exporter.release(); source.value = ''; session = transition(session,{type:'CLEAR'}); render(); });
render();
