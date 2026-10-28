import { InventoryError, LIMITS, countItems, emptyProject, parseProject, serializeProject, validateProject, fail } from './core/schema.mjs';
import { createBox, updateBox, updateItem, deleteItem, moveItem, searchItems } from './core/boxes.mjs';
import { createSession, commitProject, addSessionItem, stageImport, cancelImport, confirmImport, requestBoxDeletion, confirmBoxDeletion, cancelBoxDeletion } from './core/session.mjs';
import { renderTextReport } from './core/report.mjs';

const FILES = Object.freeze({ rooms: 'moving-boxes-rooms.txt', boxes: 'moving-boxes-contents.txt', json: 'moving-boxes-project.json' });
export function createController({ language = 'zh-Hant', notify = () => {}, createReader, makeBlob, createURL, revokeURL, setTimer, clearTimer } = {}) {
  let session = createSession();
  let generation = 0;
  let reader = null;
  let disposed = false;
  let dirty = false;
  let query = '';
  let mode = 'rooms';
  let prepared = null;
  let confirmation = null;
  let code = 'INITIAL';
  let field = '';
  let busy = false;
  const urls = new Map();
  const release = url => {
    if (!urls.has(url)) return;
    const timer = urls.get(url);
    if (timer !== null) clearTimer(timer);
    revokeURL(url);
    urls.delete(url);
  };
  function view() {
    return { project: validateProject(session.project), revision: generation, dirty, query, mode, prepared: prepared ? { text: prepared.text, filename: prepared.filename } : null, confirmation, code, field, busy, disposed, counts: { boxes: session.project.boxes.length, items: countItems(session.project) } };
  }
  function emit(kind = 'status') { if (!disposed) notify(view(), kind); }
  function invalidate() {
    generation++;
    const previous = reader;
    reader = null;
    busy = false;
    if (previous && previous.readyState === 1) previous.abort();
    prepared = null;
    for (const url of [...urls.keys()]) release(url);
    confirmation = null;
    session = cancelBoxDeletion(cancelImport(session));
    field = '';
  }
  function error(value, kind = 'status') {
    code = value instanceof InventoryError ? value.code : 'UNEXPECTED_ERROR';
    field = value instanceof InventoryError ? value.field : '';
    emit(kind);
    return false;
  }
  function mutate(transform) {
    if (disposed) return false;
    invalidate();
    try { session = transform(session); code = 'SAVED'; emit('project'); return true; }
    catch (value) { return error(value); }
  }
  function stage(project, kind = 'import') {
    session = stageImport(session, project);
    confirmation = { kind, boxes: project.boxes.length, items: countItems(project), existingBoxes: session.project.boxes.length, existingItems: countItems(session.project), preview: project.boxes.map(box => ({ id: box.id, room: box.room, items: box.items.length })) };
    code = 'IMPORT_PREVIEW';
    emit('confirmation');
  }
  function importText(source) {
    if (disposed) return false;
    invalidate();
    try { stage(parseProject(source)); return true; }
    catch (value) { return error(value); }
  }
  function importFile(file) {
    if (disposed) return false;
    invalidate();
    const ticket = generation;
    if (!file || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > LIMITS.importBytes) return error(new InventoryError('IMPORT_TOO_LARGE', 'import'));
    if (!createReader) return error(new InventoryError('UNSUPPORTED'));
    try {
      const pending = createReader();
      reader = pending;
      pending.onload = () => {
        if (disposed || ticket !== generation || reader !== pending) return;
        reader = null; busy = false;
        try {
          if (!(pending.result instanceof ArrayBuffer) || pending.result.byteLength > LIMITS.importBytes) fail('IMPORT_TOO_LARGE', 'import');
          let source;
          try { source = new TextDecoder('utf-8', { fatal: true }).decode(pending.result); } catch { fail('INVALID_JSON', 'import'); }
          stage(parseProject(source));
        }
        catch (value) { error(value); }
      };
      pending.onerror = () => {
        if (disposed || ticket !== generation || reader !== pending) return;
        reader = null; busy = false; error(new InventoryError('READ_FAILED', 'import'));
      };
      pending.onabort = () => {
        if (disposed || ticket !== generation || reader !== pending) return;
        reader = null; busy = false; code = 'CANCELLED'; emit();
      };
      busy = true; code = 'READING'; emit();
      pending.readAsArrayBuffer(file);
      return true;
    } catch (value) { reader = null; busy = false; return error(value); }
  }
  function prepareExport() {
    if (disposed) return false;
    invalidate();
    try {
      if (dirty) fail('UNSAVED_DRAFTS');
      if (!makeBlob || !createURL || !revokeURL || !setTimer || !clearTimer) fail('UNSUPPORTED');
      const text = mode === 'json' ? serializeProject(session.project) : renderTextReport(session.project, mode, language);
      const blob = makeBlob([text], { type: mode === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8' });
      const url = createURL(blob);
      urls.set(url, null);
      prepared = { text, url, filename: FILES[mode], revision: generation };
      code = 'EXPORT_READY'; emit(); return true;
    } catch (value) { return error(value); }
  }
  function download() {
    if (disposed || !prepared || prepared.revision !== generation || dirty) return null;
    const artifact = { url: prepared.url, filename: prepared.filename };
    // Keep the URL alive for browser handoff; a second click requires a new preview.
    urls.set(artifact.url, setTimer(() => release(artifact.url), 10000));
    prepared = null;
    code = 'DOWNLOAD_REQUESTED'; emit();
    return artifact;
  }
  function confirm() {
    if (disposed || !confirmation) return false;
    const pending = confirmation;
    if (pending.kind === 'import' || pending.kind === 'example') {
      const project = session.pendingImport;
      dirty = false;
      return mutate(current => confirmImport(stageImport(current, project)));
    }
    if (pending.kind === 'box') return mutate(current => confirmBoxDeletion(requestBoxDeletion(current, pending.id)));
    if (pending.kind === 'item') return mutate(current => commitProject(current, deleteItem(current.project, pending.boxId, pending.id)));
    return false;
  }
  const api = {
    view, importText, importFile, prepareExport, download, confirm,
    editDraft(value = true) { if (disposed) return; invalidate(); dirty = value; code = value ? 'DRAFTS' : 'EDITING'; emit(); },
    setDraftDirty(value) { if (disposed) return; if (value && !dirty) invalidate(); dirty = value; emit(); },
    setQuery(value) {
      if (disposed) return false;
      invalidate(); query = value;
      try { searchItems(session.project, query); code = 'SEARCH_UPDATED'; emit('search'); return true; } catch (value) { return error(value, 'search'); }
    },
    search() { try { return searchItems(session.project, query); } catch { return []; } },
    setMode(value) {
      if (disposed) return false;
      invalidate();
      if (!Object.hasOwn(FILES, value)) return error(new InventoryError('INVALID_REPORT_MODE'));
      mode = value; code = 'EDITING'; emit(); return true;
    },
    createBox(draft) { return mutate(current => commitProject(current, createBox(current.project, draft))); },
    updateBox(id, draft) { return mutate(current => commitProject(current, updateBox(current.project, id, draft))); },
    addItem(boxId, draft) { return mutate(current => addSessionItem(current, boxId, draft)); },
    updateItem(boxId, id, draft) { return mutate(current => commitProject(current, updateItem(current.project, boxId, id, draft))); },
    moveItem(boxId, id, targetId) { return mutate(current => commitProject(current, moveItem(current.project, boxId, id, targetId))); },
    requestDeleteBox(id) {
      if (disposed) return false;
      invalidate();
      if (dirty) return error(new InventoryError('UNSAVED_EDITS'));
      try {
        session = requestBoxDeletion(session, id);
        if (session.pendingDelete) { confirmation = { kind: 'box', ...session.pendingDelete }; code = 'DELETE_PREVIEW'; emit('confirmation'); }
        else { code = 'DELETED'; emit('project'); }
        return true;
      } catch (value) { return error(value); }
    },
    requestDeleteItem(boxId, id) {
      if (disposed) return false;
      invalidate();
      if (dirty) return error(new InventoryError('UNSAVED_EDITS'));
      const item = session.project.boxes.find(box => box.id === boxId)?.items.find(item => item.id === id);
      if (!item) return error(new InventoryError('ITEM_NOT_FOUND'));
      confirmation = { kind: 'item', boxId, id, name: item.name, quantity: item.quantity }; code = 'DELETE_PREVIEW'; emit('confirmation'); return true;
    },
    loadExample() {
      if (disposed) return false;
      invalidate();
      const en = language === 'en';
      const project = validateProject({ schemaVersion: 1, boxes: [
        { id: 'BX001', room: en ? 'Kitchen' : '廚房', priority: true, notes: '', items: [{ id: 'I000001', name: en ? 'Pot' : '鍋子', quantity: 1, notes: '' }] },
        { id: 'BX002', room: en ? 'Study' : '書房', priority: false, notes: '', items: [{ id: 'I000002', name: en ? 'Charger' : '充電器', quantity: 2, notes: '' }] }
      ] });
      if (session.project.boxes.length || dirty) { stage(project, 'example'); return true; }
      session = commitProject(session, project); dirty = false; code = 'EXAMPLE_LOADED'; emit('project'); return true;
    },
    cancel() { if (disposed) return; invalidate(); code = 'CANCELLED'; emit('confirmation'); },
    clear() { if (disposed) return; invalidate(); session = createSession(emptyProject()); dirty = false; query = ''; code = 'CLEARED'; emit('project'); },
    dispose() { if (disposed) return; invalidate(); session = createSession(); query = ''; dirty = false; disposed = true; }
  };
  return api;
}
