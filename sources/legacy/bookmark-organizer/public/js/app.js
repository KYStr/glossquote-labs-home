import { OrganizerSession } from './core/session.js';
import { chooseKeeper, exclusionIndexes, excludeConfirmed, moveBookmark, renameFolder, setIncluded, buildTree } from './core/organizer.js';
import { copy } from './copy.js';
import { renderFolders, renderBookmarks, fillPathSelect, element } from './ui.js';
const text = copy[document.documentElement.lang] ?? copy.en;
const byId = id => document.getElementById(id);
const source = byId('source');
let path = null;
let currentJob = null;
let pending = null;
let moving = null;
let moveOrigin = null;
const number = value => new Intl.NumberFormat(document.documentElement.lang).format(value);
const session = new OrganizerSession({ workerFactory: () => new Worker(new URL('./parse-worker.js', import.meta.url), { type: 'module' }), onChange: state => render(state) });
function clearEditors() {
  pending = null; moving = null;
  byId('confirmation').hidden = true; byId('folder-editor').hidden = true;
  byId('confirmation-copy').textContent = ''; byId('confirmation-target').textContent = ''; byId('folder-editor-title').textContent = '';
  byId('new-path').value = ''; byId('rename-path').value = ''; byId('destination').replaceChildren();
  byId('folder-error').textContent = ''; byId('rename-error').textContent = ''; byId('feedback').textContent = '';
}
function outputFolderCount(job) {
  const count = node => node.children.reduce((total, child) => total + (child.kind === 'folder' ? 1 + count(child) : 0), 0);
  return count(buildTree(job.bookmarks.filter(item => item.included)));
}
function render(state) {
  const focusId = document.activeElement?.id;
  const ready = Boolean(state.job);
  if (currentJob !== state.jobId) {
    currentJob = state.jobId; path = null;
    byId('search').value = ''; byId('view-mode').value = 'all'; clearEditors();
  }
  byId('workspace').hidden = !ready;
  byId('cancel').hidden = !['selected', 'decoding', 'tokenizing'].includes(state.phase);
  byId('reset').disabled = state.phase === 'empty';
  byId('download-html').disabled = !ready; byId('download-json').disabled = !ready;
  byId('status').textContent = ready ? text.ready : text[state.phase] ?? text.empty;
  byId('source-summary').textContent = state.sourceName ? `${state.sourceName} · ${number(state.sourceBytes)} bytes` : '';
  const error = byId('error'); error.hidden = !state.error; error.replaceChildren();
  if (state.error) error.append(element(document, 'p', text.errors[state.error.code]), element(document, 'p', `${text.errorCode}: ${state.error.code} · ${text.offset}: ${number(state.error.offset)}`, 'error-code'), element(document, 'p', text.errorIntro));
  if (ready) {
    const job = state.job;
    const included = job.bookmarks.filter(item => item.included).length;
    const groups = job.duplicateGroups.filter(item => item.memberSourceIndexes.length > 1).length;
    byId('summary').textContent = text.summary(number(job.bookmarks.length), number(included), number(groups));
    byId('output-summary').textContent = text.outputSummary(number(job.bookmarks.length), number(included), number(outputFolderCount(job)));
    renderFolders(document, byId('folder-tree'), job, text, path, selected => { path = selected; render(session.state); });
    renderRows();
    const renameValue = byId('rename-from').value;
    fillPathSelect(document, byId('rename-from'), job, text, false);
    if ([...byId('rename-from').options].some(option => option.value === renameValue)) byId('rename-from').value = renameValue;
    byId('rename-submit').disabled = !byId('rename-from').options.length;
  } else {
    byId('folder-tree').replaceChildren(); byId('bookmarks').replaceChildren();
    byId('rename-from').replaceChildren();
    byId('summary').textContent = ''; byId('output-summary').textContent = ''; clearEditors();
  }
  if (focusId) byId(focusId)?.focus({ preventScroll: true });
}
function renderRows() {
  const job = session.state.job;
  if (!job) return;
  const visible = renderBookmarks(document, byId('bookmarks'), job, text, {
    query: byId('search').value, mode: byId('view-mode').value, path,
    onInclude: (index, included) => {
      if (included) { clearEditors(); session.edit(job => setIncluded(job, index, true)); }
      else confirmExclusion({ indexes: [index], origin: `include-${index}` });
    },
    onKeeper: (groupId, index) => { clearEditors(); session.edit(job => chooseKeeper(job, groupId, index)); },
    onKeepOnly: groupId => confirmExclusion({ indexes: exclusionIndexes(job, groupId), groupId, origin: `keep-${groupId}` }),
    onMove: index => {
      pending = null; byId('confirmation').hidden = true; moving = index; moveOrigin = `move-${index}`;
      const bookmark = job.bookmarks.find(item => item.sourceIndex === index);
      byId('folder-editor').hidden = false; byId('folder-error').textContent = '';
      byId('folder-editor-title').textContent = text.editTitle(bookmark.title || text.titleEmpty, index);
      fillPathSelect(document, byId('destination'), job, text);
      byId('destination').value = JSON.stringify(bookmark.folderPath); byId('new-path').value = ''; byId('destination').focus();
    }
  });
  byId('visible-count').textContent = text.visible(number(visible), number(job.bookmarks.length));
}
function confirmExclusion({ indexes, groupId = null, origin }) {
  moving = null; byId('folder-editor').hidden = true;
  pending = { indexes, groupId, epoch: session.epoch, revision: session.revision, origin };
  byId('confirmation-copy').textContent = groupId ? text.confirmGroup(number(indexes.length)) : text.confirmExclude(number(indexes.length));
  const job = session.state.job;
  const group = job.duplicateGroups.find(item => item.groupId === groupId);
  const item = job.bookmarks.find(item => item.sourceIndex === indexes[0]);
  byId('confirmation-target').textContent = group ? `${text.sourceIndex} ${group.suggestedKeeperSourceIndex} · ${group.exactHref}` : `${text.sourceIndex} ${item.sourceIndex} · ${item.title || text.titleEmpty} · ${item.href}`;
  byId('confirmation').hidden = false; byId('confirm-exclude').focus();
}
byId('confirm-exclude').addEventListener('click', () => {
  const action = pending;
  if (!action || action.epoch !== session.epoch || action.revision !== session.revision) { clearEditors(); return; }
  clearEditors();
  session.edit(job => {
    if (action.groupId) setIncluded(job, job.duplicateGroups.find(item => item.groupId === action.groupId).suggestedKeeperSourceIndex, true);
    excludeConfirmed(job, action.indexes, true);
  });
  byId('feedback').textContent = text.confirmed; byId(action.origin)?.focus();
});
byId('cancel-exclude').addEventListener('click', () => { const origin = pending?.origin; pending = null; byId('confirmation').hidden = true; if (origin) byId(origin)?.focus(); });
byId('folder-form').addEventListener('submit', event => {
  event.preventDefault(); if (moving === null) return;
  try {
    const destination = byId('new-path').value === '' ? JSON.parse(byId('destination').value) : byId('new-path').value.split('\n');
    const index = moving; session.edit(job => moveBookmark(job, index, destination));
    byId('folder-editor').hidden = true; moving = null; byId('feedback').textContent = text.moved;
    if (moveOrigin) byId(moveOrigin)?.focus();
  } catch { byId('folder-error').textContent = text.folderError; byId('new-path').focus(); }
});
byId('cancel-move').addEventListener('click', () => { byId('folder-editor').hidden = true; moving = null; if (moveOrigin) byId(moveOrigin)?.focus(); });
byId('rename-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const from = JSON.parse(byId('rename-from').value); const to = byId('rename-path').value.split('\n');
    path = null; session.edit(job => renameFolder(job, from, to));
    byId('rename-path').value = ''; byId('rename-error').textContent = ''; clearEditors(); byId('feedback').textContent = text.renamed;
  } catch { byId('rename-error').textContent = text.folderError; byId('rename-path').focus(); }
});
source.addEventListener('change', () => { const file = source.files?.[0]; source.value = ''; void session.select(file); });
byId('cancel').addEventListener('click', () => { source.value = ''; session.cancel(); });
byId('reset').addEventListener('click', () => { source.value = ''; session.reset(); source.focus(); });
byId('search').addEventListener('input', renderRows); byId('view-mode').addEventListener('change', renderRows);
for (const kind of ['html', 'json']) byId(`download-${kind}`).addEventListener('click', () => {
  const button = byId(`download-${kind}`); button.disabled = true; button.setAttribute('aria-busy', 'true');
  try {
    const download = session.download(kind); if (!download) return;
    const anchor = element(document, 'a'); anchor.href = download.url; anchor.download = download.filename;
    document.body.append(anchor); anchor.click(); anchor.remove(); byId('feedback').textContent = text.downloaded(download.filename);
  } catch { byId('feedback').textContent = text.downloadError; }
  finally { button.disabled = !session.state.job; button.removeAttribute('aria-busy'); }
});
window.addEventListener('pagehide', () => { source.value = ''; session.dispose(); });
render(session.state);
