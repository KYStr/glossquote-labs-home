import { Workspace } from './workspace.js';
import { Downloads } from './downloads.js';
import { connectUI } from './ui.js';
import { messages } from './i18n.js';

const lang = document.documentElement.lang;
const m = messages[lang];
const downloads = new Downloads({
  blob: (bytes, type) => new Blob([bytes], { type }),
  create: blob => URL.createObjectURL(blob),
  revoke: url => URL.revokeObjectURL(url),
  activate: (url, filename) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  },
  later: callback => setTimeout(callback, 1000),
  cancel: timer => clearTimeout(timer)
});
let ui;
const workspace = new Workspace(document.getElementById('audio'), {
  defaultTitle: m.name,
  discardDownloads: () => downloads.clear(),
  changed: reason => ui?.render(reason)
});
ui = connectUI(document, workspace, downloads, m, lang);
ui.render();
window.addEventListener('pagehide', () => {
  workspace.reset();
  downloads.clear();
  document.getElementById('audio-file').value = '';
  document.getElementById('import-file').value = '';
});
