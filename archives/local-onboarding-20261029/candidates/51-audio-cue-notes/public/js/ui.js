import { formatTime, noteBytes, sortForDisplay, MAX_NOTE_ID } from './core/notes.js';
import { serializeJson } from './core/serialize-json.js';

export function connectUI(doc, workspace, downloads, m, locale) {
  const $ = id => doc.getElementById(id);
  const number = value => value.toLocaleString(locale);
  let editorKey = null;
  let shownTitle = null;
  let shownDuration = null;
  let shownResult = null;
  let previousPending = null;
  let pendingFocus = null;
  const setFeedback = text => { $('feedback').textContent = text; };
  const focus = id => { const target = $(id); (target && !target.disabled ? target : $('notes-heading')).focus(); };
  const disable = (ids, value) => ids.forEach(id => { $(id).disabled = value; });
  const button = (text, action, className = '') => {
    const element = doc.createElement('button');
    element.type = 'button';
    element.textContent = text;
    element.className = className;
    element.addEventListener('click', action);
    return element;
  };

  function renderTime() {
    const time = workspace.audio.currentTimeMs();
    $('position').textContent = typeof time === 'number' ? formatTime(time) : '—';
    const over = !!workspace.result && typeof time === 'number' && time > workspace.result.durationMs;
    $('over-timeline').hidden = !over;
    $('capture').disabled = workspace.busy() || !!workspace.draft || !!workspace.editingId ||
      !workspace.result || typeof time !== 'number' || over || workspace.counter > MAX_NOTE_ID;
    // ID exhaustion stays visible even though capture itself is unavailable.
    if (workspace.result && workspace.counter > MAX_NOTE_ID && !workspace.error) {
      $('error').hidden = false;
      $('error').textContent = m.errors.NOTE_ID_EXHAUSTED;
    }
    const state = workspace.audio.durationMs === null && workspace.result && !workspace.loading
      ? 'imported' : workspace.status;
    const status = m.status[state];
    if ($('playback-state').textContent !== status) $('playback-state').textContent = status;
  }

  function renderEditor() {
    const key = workspace.draft ? 'draft' : workspace.editingId;
    $('editor').hidden = !key;
    if (key !== editorKey) {
      $('note-text').value = workspace.editingId
        ? workspace.result.notes.find(note => note.noteId === workspace.editingId).text : '';
      editorKey = key;
    }
    $('editor-heading').textContent = workspace.editingId ? m.editor : m.newNote;
    const note = workspace.editingId && workspace.result.notes.find(item => item.noteId === workspace.editingId);
    $('draft-time').textContent = key ? formatTime(workspace.draft?.timeMs ?? note.timeMs) : '';
    disable(['note-text', 'save-note', 'cancel-editor'], workspace.busy());
  }

  function renderNotes() {
    const notes = workspace.result?.notes ?? [];
    $('quota').textContent = `${m.noteQuota} ${number(notes.length)} / ${number(1000)} · ${m.bytesQuota} ${number(noteBytes(notes))} / ${number(1_048_576)} bytes`;
    $('empty-notes').hidden = notes.length > 0;
    const fragment = doc.createDocumentFragment();
    for (const note of sortForDisplay(notes)) {
      const row = doc.createElement('li');
      row.className = 'note';
      const tools = doc.createElement('div');
      tools.className = 'note-tools';
      const jump = button(`${formatTime(note.timeMs)} · ${m.jump}`, () => workspace.seek(note.noteId), 'time');
      const unavailable = workspace.audio.durationMs === null || note.timeMs > workspace.audio.durationMs;
      jump.disabled = unavailable || workspace.busy();
      jump.setAttribute('aria-label', `${m.jump} ${formatTime(note.timeMs)}`);
      tools.append(jump);
      const edit = button(m.edit, () => {
        const outcome = workspace.beginEdit(note.noteId);
        if (!outcome.error) focus('note-text');
      });
      edit.id = `edit-${note.noteId}`;
      const remove = button(m.delete, () => {
        workspace.deleteNote(note.noteId);
        focus('notes-heading');
      }, 'quiet');
      edit.disabled = remove.disabled = workspace.busy() || !!workspace.draft || !!workspace.editingId;
      edit.setAttribute('aria-label', `${m.edit} ${formatTime(note.timeMs)}`);
      remove.setAttribute('aria-label', `${m.delete} ${formatTime(note.timeMs)}`);
      tools.append(edit, remove);
      row.append(tools);
      if (unavailable) {
        const warning = doc.createElement('div');
        warning.className = 'range-warning';
        warning.textContent = workspace.audio.durationMs === null ? m.noAudioSeek : m.outOfRange;
        row.append(warning);
      }
      const text = doc.createElement('p');
      text.textContent = note.text;
      row.append(text);
      fragment.append(row);
    }
    $('notes').replaceChildren(fragment);
  }

  function renderConfirmation() {
    const pending = workspace.pending;
    $('confirmation').hidden = !pending;
    if (!pending) { previousPending = null; return; }
    const actions = $('confirmation-actions');
    actions.replaceChildren();
    const cancel = button(m.cancel, () => {
      workspace.cancelPending();
      setFeedback(m.cancelled);
      focus(pendingFocus ?? 'audio-file');
    });
    actions.append(cancel);
    $('confirmation-summary').textContent = '';
    $('confirmation-mismatch').hidden = true;
    if (pending.kind === 'reading') {
      $('confirmation-heading').textContent = m.importConfirm;
      $('confirmation-detail').textContent = m.reading;
    } else if (pending.kind === 'import') {
      $('confirmation-heading').textContent = m.importConfirm;
      $('confirmation-detail').textContent = m.importConsequence;
      const value = pending.result;
      $('confirmation-summary').textContent = `${m.sourceTitle}: ${value.sourceTitle}\n${m.duration}: ${formatTime(value.durationMs, true)}\n${m.noteQuota}: ${number(value.notes.length)} · ${m.bytesQuota}: ${number(noteBytes(value.notes))} bytes`;
      const actual = workspace.audio.durationMs;
      if (actual !== null && actual !== value.durationMs) {
        $('confirmation-mismatch').hidden = false;
        $('confirmation-mismatch').textContent = `${m.mismatchPreview}: ${value.durationMs} / ${actual}`;
      }
      actions.append(button(m.replaceNotes, () => {
        workspace.confirmImport();
        setFeedback(m.saved);
        focus('notes-heading');
      }, 'primary'));
    } else if (pending.kind === 'source' || pending.kind === 'attach') {
      const attach = pending.kind === 'attach';
      $('confirmation-heading').textContent = attach ? m.attachConfirm : m.sourceConfirm;
      $('confirmation-detail').textContent = attach ? m.attachConsequence : m.sourceConsequence;
      $('confirmation-summary').textContent = `${pending.file.name} · ${number(pending.file.size)} bytes`;
      if (attach) actions.append(button(m.attach, () => {
        workspace.confirmSource(true);
        focus('audio-file');
      }, 'primary'));
      actions.append(button(attach ? m.startNew : m.replaceSource, () => {
        workspace.confirmSource(false);
        focus('audio-file');
      }, 'danger'));
    } else if (pending.kind === 'clear') {
      $('confirmation-heading').textContent = m.clearConfirm;
      $('confirmation-detail').textContent = m.clearConsequence;
      actions.append(button(m.confirmClear, () => {
        workspace.reset();
        focus('audio-file');
      }, 'danger'));
    }
    if (previousPending !== pending.kind) cancel.focus();
    previousPending = pending.kind;
  }

  function render(reason = 'state') {
    if (reason === 'time') return renderTime();
    setFeedback('');
    const result = workspace.result;
    $('metadata').hidden = !result;
    if (result !== shownResult || (result?.sourceTitle ?? null) !== shownTitle) {
      $('source-title').value = result?.sourceTitle ?? '';
      shownTitle = result?.sourceTitle ?? null;
    }
    if (result !== shownResult || (result?.durationMs ?? null) !== shownDuration) {
      $('source-duration').value = result ? formatTime(result.durationMs, true) : '';
      shownDuration = result?.durationMs ?? null;
    }
    shownResult = result;
    const audio = workspace.audio;
    $('source-info').textContent = audio.file ? `${audio.file.name} · ${number(audio.file.size)} bytes` : m.noSource;
    $('duration-info').textContent = audio.durationMs === null ? '' : `${m.actualDuration}: ${formatTime(audio.durationMs, true)} (${audio.durationMs} ms)`;
    const mismatch = result && audio.durationMs !== null && result.durationMs !== audio.durationMs;
    $('duration-mismatch').hidden = !mismatch;
    $('adopt-duration').hidden = !mismatch;
    $('adopt-duration').disabled = workspace.busy();
    disable(['source-title', 'source-duration', 'save-metadata'], !result || workspace.busy());
    disable(['audio-file', 'import-file'], workspace.busy());
    $('clear').disabled = !result && !audio.url && !workspace.pending;
    // While loading or reading, clear remains available to cancel the active job.
    $('clear').disabled ||= workspace.pending?.kind === 'clear';
    disable(['export-markdown', 'export-json'], !result || workspace.busy());
    $('error').hidden = !workspace.error;
    $('error').textContent = workspace.error ? m.errors[workspace.error] ?? m.errors.INVALID_RESULT : '';
    $('source-title').setAttribute('aria-invalid', String(workspace.error === 'TITLE_INVALID'));
    $('source-duration').setAttribute('aria-invalid', String(['DURATION_FORMAT', 'DURATION_RANGE'].includes(workspace.error)));
    $('note-text').setAttribute('aria-invalid', String(['NOTE_EMPTY', 'NOTE_TOO_LONG', 'NOTE_TOTAL_BYTES', 'NOTE_LIMIT'].includes(workspace.error)));
    renderEditor();
    renderNotes();
    renderTime();
    renderConfirmation();
  }

  $('audio-file').addEventListener('change', event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    pendingFocus = 'audio-file';
    workspace.selectSource(file);
  });
  $('import-file').addEventListener('change', event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    pendingFocus = 'import-file';
    void workspace.previewImport(file);
  });
  $('capture').addEventListener('click', () => {
    const outcome = workspace.beginDraft();
    if (!outcome.error) focus('note-text');
  });
  $('note-form').addEventListener('submit', event => {
    event.preventDefault();
    const editId = workspace.editingId;
    const outcome = workspace.saveNote($('note-text').value);
    if (outcome.error) focus('note-text');
    else {
      setFeedback(m.saved);
      focus(editId ? `edit-${editId}` : 'capture');
    }
  });
  $('cancel-editor').addEventListener('click', () => {
    const id = workspace.editingId;
    workspace.cancelEditor();
    focus(id ? `edit-${id}` : 'capture');
  });
  $('metadata-form').addEventListener('submit', event => {
    event.preventDefault();
    const outcome = workspace.setMetadata($('source-title').value, $('source-duration').value);
    if (outcome.error) focus(outcome.error === 'TITLE_INVALID' ? 'source-title' : 'source-duration');
    else setFeedback(m.saved);
  });
  $('adopt-duration').addEventListener('click', () => {
    const outcome = workspace.adoptDuration();
    if (!outcome.error) { setFeedback(m.saved); focus('capture'); }
  });
  $('clear').addEventListener('click', () => { pendingFocus = 'clear'; workspace.requestClear(); });
  for (const format of ['markdown', 'json']) {
    $(`export-${format}`).addEventListener('click', () => {
      if (!workspace.result || workspace.busy()) return;
      const outcome = downloads.export(workspace.result, format);
      if (outcome.error) {
        workspace.fail(outcome.error);
        if (outcome.error === 'EXPORT_TOO_LARGE' && format === 'markdown' &&
            serializeJson(workspace.result) instanceof Uint8Array) {
          $('error').textContent += ` ${m.exportJsonAvailable}`;
        }
      }
      else { workspace.error = null; render(); setFeedback(`${m.downloaded} (${number(outcome.bytes)} bytes)`); }
    });
  }
  return { render };
}
