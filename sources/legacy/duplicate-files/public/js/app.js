import { AnalysisSession } from './core/session.js';
import { createUI, COPY } from './ui.js';

const language = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
const text = COPY[language];
const input = document.getElementById('files');
const dropzone = document.getElementById('dropzone');
let ui;
const session = new AnalysisSession({
  workerFactory: () => new Worker(new URL('./analysis-worker.js', import.meta.url), { type: 'module' }),
  onChange: snapshot => ui.render(snapshot)
});
ui = createUI(document, language, session);
const supported = typeof Worker === 'function' && typeof File === 'function' && typeof Blob === 'function' && typeof globalThis.crypto?.subtle?.digest === 'function';
ui.setSupported(supported);
ui.render(session.snapshot());

function appendFiles(files) {
  if (!files.length || !supported) return;
  session.setFiles([...session.files.map(item => item.file), ...files]);
  input.value = '';
}
input.addEventListener('change', () => appendFiles(Array.from(input.files ?? [])));
document.getElementById('scan').addEventListener('click', () => session.start());
document.getElementById('cancel').addEventListener('click', () => { session.cancel(); document.getElementById('scan').focus({ preventScroll: true }); });
document.getElementById('reset').addEventListener('click', () => { session.reset(); input.value = ''; input.focus({ preventScroll: true }); });
for (const format of ['json', 'txt']) {
  document.getElementById(`download-${format}`).addEventListener('click', () => {
    try {
      const download = session.download(format);
      if (!download) return;
      const link = document.createElement('a');
      link.href = download.url; link.download = download.filename;
      document.body.append(link); link.click(); link.remove();
      ui.announce(text.downloadRequested);
    } catch { ui.announce(text.downloadFailed); }
  });
}
document.getElementById('report-preview').addEventListener('toggle', () => ui.renderPreview(session.result));
let dragDepth = 0;
dropzone.addEventListener('dragenter', event => { event.preventDefault(); dragDepth++; dropzone.classList.add('is-dragover'); });
dropzone.addEventListener('dragover', event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; });
dropzone.addEventListener('dragleave', event => { event.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; dropzone.classList.remove('is-dragover'); } });
dropzone.addEventListener('drop', event => {
  event.preventDefault(); dragDepth = 0; dropzone.classList.remove('is-dragover');
  appendFiles(Array.from(event.dataTransfer?.files ?? []));
});
// File drops outside the source region must not navigate away from the worksheet.
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());
globalThis.addEventListener('pagehide', () => { session.pagehide(); input.value = ''; dragDepth = 0; dropzone.classList.remove('is-dragover'); });
