import {
  emptyResult, createDraft, commitDraft, editNote, nextNoteIdCounter,
  validTitle, parseDuration, maxNoteTime, MAX_IMPORT_BYTES, MAX_NOTE_ID
} from './core/notes.js';
import { parseImport } from './core/validate-json.js';
import { AudioController, validateAudioFile } from './audio-controller.js';

export class Workspace {
  constructor(audio, { urls = URL, changed = () => {}, discardDownloads = () => {}, defaultTitle = 'Recording' } = {}) {
    this.result = null;
    this.draft = null;
    this.editingId = null;
    this.pending = null;
    this.counter = 1;
    this.jobId = 0;
    this.loading = false;
    this.retain = false;
    this.error = null;
    this.status = 'empty';
    this.changed = changed;
    this.discardDownloads = discardDownloads;
    this.defaultTitle = defaultTitle;
    this.audio = new AudioController(audio, {
      onReady: (ms, first) => {
        if (first && !this.retain && this.result) this.result.durationMs = ms;
        this.loading = false;
        this.status = audio.paused ? 'paused' : 'playing';
        this.emit();
      },
      onError: code => {
        const hadReadyWorkspace = !this.loading && this.result !== null;
        this.invalidate();
        this.loading = false;
        // Initial load failure discards its provisional empty workspace. Once
        // metadata established a workspace, playback failure must not delete it.
        if (!this.retain && !hadReadyWorkspace) this.result = null;
        this.error = code;
        this.status = 'failed';
        this.emit();
      },
      onTime: () => this.emit('time'),
      onPlayback: state => { this.status = state; this.emit('time'); }
    }, urls);
  }

  emit(reason = 'state') { this.changed(reason); }
  fail(error) { this.error = error; this.emit(); return { error }; }
  busy() { return this.loading || !!this.pending; }
  invalidate() {
    this.jobId += 1;
    this.pending = null;
    this.draft = null;
    this.editingId = null;
    this.discardDownloads();
  }
  mutated() { this.discardDownloads(); this.error = null; this.emit(); return { ok: true }; }

  selectSource(file) {
    const checked = validateAudioFile(file);
    if (checked.error) return this.fail(checked.error);
    if (this.loading) return this.fail('BUSY');
    // Opening a source choice invalidates outstanding imports, never the active audio.
    this.jobId += 1;
    this.pending = null;
    this.error = null;
    if (this.audio.url || this.result) {
      this.pending = { kind: this.audio.url ? 'source' : 'attach', file };
      this.emit();
      return { preview: true };
    }
    return this.loadSource(file, false);
  }

  loadSource(file, retain) {
    this.invalidate();
    this.audio.release();
    this.retain = retain;
    this.loading = true;
    this.status = 'loading';
    this.error = null;
    if (!retain) {
      this.counter = 1;
      this.result = emptyResult(validTitle(file.name) ? file.name : this.defaultTitle);
    }
    this.emit();
    const loaded = this.audio.load(file);
    if (loaded.error) {
      this.loading = false;
      if (!retain) this.result = null;
      this.status = 'failed';
      return this.fail(loaded.error);
    }
    return { ok: true };
  }

  confirmSource(retain = false) {
    if (!this.pending || !['source', 'attach'].includes(this.pending.kind)) return { error: 'BUSY' };
    const pending = this.pending;
    return this.loadSource(pending.file, pending.kind === 'attach' && retain);
  }

  async previewImport(file) {
    if (this.loading) return this.fail('BUSY');
    const job = ++this.jobId;
    this.pending = null;
    this.error = null;
    this.discardDownloads();
    if (!file || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_IMPORT_BYTES) {
      return this.fail('IMPORT_TOO_LARGE');
    }
    this.pending = { kind: 'reading' };
    this.emit();
    let buffer;
    try { buffer = await file.arrayBuffer(); }
    catch { if (job !== this.jobId) return { stale: true }; this.pending = null; return this.fail('IMPORT_READ'); }
    if (job !== this.jobId) return { stale: true };
    const checked = parseImport(new Uint8Array(buffer));
    if (checked.error) { this.pending = null; return this.fail(checked.error); }
    this.pending = { kind: 'import', result: checked.result };
    this.emit();
    return { preview: true };
  }

  confirmImport() {
    if (this.pending?.kind !== 'import') return { error: 'BUSY' };
    const result = this.pending.result;
    this.invalidate();
    // Import invalidates pending parsing and drafts. The attached media resource
    // and its live listeners remain current, preserving playback and position.
    this.result = result;
    this.counter = nextNoteIdCounter(result.notes);
    return this.mutated();
  }

  cancelPending() {
    this.jobId += 1;
    this.pending = null;
    this.error = null;
    this.emit();
    return { ok: true };
  }

  requestClear() {
    if (!this.result && !this.audio.url && !this.pending) return { error: 'EMPTY' };
    this.jobId += 1;
    this.pending = { kind: 'clear' };
    this.error = null;
    this.emit();
    return { preview: true };
  }

  reset() {
    this.invalidate();
    this.audio.release();
    this.result = null;
    this.counter = 1;
    this.loading = false;
    this.retain = false;
    this.error = null;
    this.status = 'empty';
    this.emit();
  }

  beginDraft() {
    if (this.busy() || !this.result || this.draft || this.editingId) return this.fail('BUSY');
    if (this.counter > MAX_NOTE_ID) return this.fail('NOTE_ID_EXHAUSTED');
    const time = this.audio.currentTimeMs();
    if (typeof time !== 'number') return this.fail('AUDIO_TIME');
    const draft = createDraft(time, this.result.durationMs);
    if (draft.error) return this.fail(draft.error);
    this.draft = draft;
    this.error = null;
    this.emit();
    return { ok: true };
  }

  saveNote(text) {
    if (this.busy() || !this.result) return this.fail('BUSY');
    if (this.editingId) {
      const edited = editNote(this.result.notes, this.editingId, text);
      if (edited.error) return this.fail(edited.error);
      this.result.notes = edited.notes;
    } else {
      const committed = commitDraft(this.result.notes, this.draft, this.counter, text, this.result.durationMs);
      if (committed.error) return this.fail(committed.error);
      this.result.notes = committed.notes;
      this.counter = committed.nextCounter;
    }
    this.draft = null;
    this.editingId = null;
    return this.mutated();
  }

  beginEdit(id) {
    if (this.busy() || this.draft || this.editingId) return this.fail('BUSY');
    if (!this.result?.notes.some(note => note.noteId === id)) return this.fail('NOTE_MISSING');
    this.editingId = id;
    this.error = null;
    this.emit();
    return { ok: true };
  }

  cancelEditor() { this.draft = null; this.editingId = null; this.error = null; this.emit(); }

  deleteNote(id) {
    if (this.busy() || this.draft || this.editingId || !this.result) return this.fail('BUSY');
    this.result.notes = this.result.notes.filter(note => note.noteId !== id);
    return this.mutated();
  }

  setMetadata(title, durationText) {
    if (!this.result || this.busy()) return this.fail('BUSY');
    if (!validTitle(title)) return this.fail('TITLE_INVALID');
    const duration = parseDuration(durationText);
    if (typeof duration !== 'number') return this.fail(duration.error);
    if (duration < maxNoteTime(this.result.notes) || (this.draft && duration < this.draft.timeMs)) {
      return this.fail('DURATION_RANGE');
    }
    this.result.sourceTitle = title;
    this.result.durationMs = duration;
    return this.mutated();
  }

  adoptDuration() {
    if (this.busy() || !this.result || this.audio.durationMs === null) return this.fail('BUSY');
    if (this.audio.durationMs < maxNoteTime(this.result.notes)) return this.fail('DURATION_RANGE');
    this.result.durationMs = this.audio.durationMs;
    return this.mutated();
  }

  seek(id) {
    if (this.busy()) return this.fail('BUSY');
    const note = this.result?.notes.find(item => item.noteId === id);
    const checked = note ? this.audio.seek(note.timeMs) : { error: 'NOTE_MISSING' };
    if (checked.error) return this.fail(checked.error);
    this.emit('time');
    return checked;
  }
}
