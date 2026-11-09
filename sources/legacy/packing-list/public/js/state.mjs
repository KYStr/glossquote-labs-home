import { createEmptyDraft, createRowDraft, validateDraft, parseBackupBytes, makeExampleList, MAX_ROWS, MAX_BACKUP_BYTES } from './core/packing-list.mjs';

export function createPackingState() {
  let draft = createEmptyDraft();
  let validation = validateDraft(draft);
  let revision = 0;
  let importRequestId = 0;
  let candidate = null;
  let disposed = false;
  let sequence = 0;
  let filter = 'all';
  let example = false;
  let importState = 'idle';
  let importError = null;
  const invalidate = () => {
    importRequestId++;
    candidate = null;
    importState = 'idle';
    importError = null;
  };
  const changed = () => {
    revision++;
    invalidate();
    example = false;
    validation = validateDraft(draft);
  };
  return {
    view() { return { draft, validation, revision, importRequestId, candidate, disposed, filter, example, importState, importError }; },
    add() {
      if (disposed || draft.rows.length >= MAX_ROWS) return null;
      let id;
      do { id = `row-${++sequence}`; } while (draft.rows.some(row => row.id === id));
      draft.rows.push(createRowDraft(id));
      changed();
      return id;
    },
    edit(id, field, value) {
      if (disposed || !['nameRaw', 'quantityRaw', 'unitWeightGramsRaw', 'packed'].includes(field)) return false;
      const row = draft.rows.find(item => item.id === id);
      if (!row) return false;
      row[field] = value;
      changed();
      return true;
    },
    limit(value) { if (!disposed) { draft.limitGramsRaw = value; changed(); } },
    remove(id) {
      if (disposed) return false;
      const index = draft.rows.findIndex(row => row.id === id);
      if (index < 0) return false;
      draft.rows.splice(index, 1);
      changed();
      return true;
    },
    setFilter(value) { if (!disposed && ['all', 'unpacked'].includes(value)) filter = value; },
    loadExample(confirmed, language) {
      if (!confirmed || disposed) return false;
      draft = makeExampleList(language);
      filter = 'all';
      changed();
      example = true;
      return true;
    },
    reset(confirmed) {
      if (!confirmed || disposed) return false;
      draft = createEmptyDraft();
      filter = 'all';
      changed();
      return true;
    },
    cancelImport() { if (!disposed) invalidate(); },
    async readFile(file) {
      if (disposed) return false;
      invalidate();
      if (!file) return false;
      const requestId = importRequestId;
      const sourceRevision = revision;
      importState = 'reading';
      const current = () => !disposed && requestId === importRequestId && sourceRevision === revision;
      if (file.size > MAX_BACKUP_BYTES) {
        importState = 'error'; importError = 'FILE_TOO_LARGE'; return false;
      }
      let parsed;
      try { parsed = parseBackupBytes(new Uint8Array(await file.arrayBuffer())); }
      catch {
        if (current()) { importState = 'error'; importError = 'INVALID_BYTES'; }
        return false;
      }
      if (!current()) return false;
      if (!parsed.ok) { importState = 'error'; importError = parsed.code; return false; }
      candidate = { listDraft: parsed.listDraft, preview: parsed.preview, requestId, revision: sourceRevision };
      importState = 'preview';
      return true;
    },
    confirmImport() {
      if (disposed || !candidate || candidate.requestId !== importRequestId || candidate.revision !== revision) return false;
      draft = candidate.listDraft;
      filter = 'all';
      changed();
      return true;
    },
    dispose() {
      disposed = true;
      revision++;
      invalidate();
      draft = null;
      validation = null;
    }
  };
}

// Injectable APIs allow offline lifecycle tests; they are not native download evidence.
export function createDownloadManager({ url = URL, schedule = setTimeout, cancel = clearTimeout } = {}) {
  const active = new Map();
  const revoke = value => {
    if (!active.has(value)) return;
    cancel(active.get(value));
    active.delete(value);
    url.revokeObjectURL(value);
  };
  return {
    create(blob) {
      const value = url.createObjectURL(blob);
      active.set(value, schedule(() => revoke(value), 60000));
      return value;
    },
    dispose() { for (const value of [...active.keys()]) revoke(value); },
    count() { return active.size; }
  };
}
