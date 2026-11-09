import { createSession } from './session.mjs';
import { COPY } from './strings.mjs';
import { FILENAMES } from './core/export.mjs';

export function mountApp({ document, window, navigator, sessionOptions = {} }) {
  const language = document.documentElement.lang === 'en' ? 'en' : 'zh-Hant';
  const text = COPY[language];
  const format = value => new Intl.NumberFormat(language).format(value);
  const ids = ['csv', 'csv-file', 'source-status', 'reuse-paste', 'template', 'template-count', 'fields', 'allow-blank',
    'missing', 'literal-warning', 'blank-warning', 'unknown-fields', 'validation-error', 'status', 'stale-notice',
    'generate', 'cancel', 'reset', 'sample', 'preview', 'preview-empty', 'preview-content', 'row-label', 'previous',
    'next', 'row-number', 'jump', 'copy', 'copy-status', 'copy-fallback', 'copy-text', 'select-text',
    'download-txt', 'download-json', 'export-size', 'blank-record'];
  const ui = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  let rowIndex = 0;
  let lastResult = null;
  let activeGeneration = -1;
  let fileAttempt = null;
  const session = createSession({ ...sessionOptions, language, onChange: paint });

  function clearCopy() {
    ui['copy-status'].textContent = '';
    ui['copy-fallback'].hidden = true;
    ui['copy-text'].value = '';
  }
  function setDownload(anchor, url, filename) {
    anchor.hidden = !url;
    if (url) { anchor.href = url; anchor.download = filename; }
    else { anchor.removeAttribute('href'); anchor.removeAttribute('download'); }
  }
  function paintPreview(state) {
    const records = state.result?.records;
    if (state.result !== lastResult) { rowIndex = 0; lastResult = state.result; clearCopy(); }
    const available = Boolean(records?.length);
    ui['preview-empty'].hidden = available;
    ui['preview-content'].hidden = !available;
    ui.preview.textContent = available ? records[rowIndex].text : '';
    ui['row-label'].textContent = available ? text.row(format(rowIndex + 1), format(records.length)) : '';
    ui.previous.disabled = !available || rowIndex === 0;
    ui.next.disabled = !available || rowIndex === records.length - 1;
    ui.copy.disabled = !available;
    ui.jump.disabled = !available;
    ui['row-number'].disabled = !available;
    ui['row-number'].max = available ? records.length : 1;
    ui['row-number'].value = available ? String(rowIndex + 1) : '';
    const blanks = available ? records[rowIndex].blankFields : [];
    ui['blank-record'].hidden = !blanks.length;
    ui['blank-record'].textContent = blanks.length ? text.blankRecord(blanks.join(' · ')) : '';
    ui['export-size'].textContent = available ? text.exportSize(format(state.result.combinedBytes)) : '';
    setDownload(ui['download-txt'], available && state.urls?.txt, FILENAMES.txt);
    setDownload(ui['download-json'], available && state.urls?.json, FILENAMES.json);
  }
  function paint(state) {
    const generation = session.getGeneration();
    if (generation !== activeGeneration) { activeGeneration = generation; clearCopy(); }
    document.documentElement.dataset.state = state.phase;
    ui['template-count'].textContent = `${format(state.template.length)} / ${format(32768)}`;
    ui['template-count'].dataset.over = String(state.template.length > 32768);
    const retainedPaste = Boolean(fileAttempt && ui.csv.value && !state.source);
    ui['source-status'].textContent = state.source ? `${state.sourceLabel} · ${text.loaded(format(state.source.rows.length), format(state.source.headers.length))}` :
      [state.pendingRead ? text.loading : '', retainedPaste ? (state.pendingRead ? text.pastePending : text.pasteRetained) : ''].filter(Boolean).join(' ');
    ui['reuse-paste'].hidden = !retainedPaste || state.pendingRead;
    ui.fields.replaceChildren();
    if (state.source) {
      for (const header of state.source.headers) {
        const item = document.createElement('li');
        const marker = document.createElement('code');
        marker.textContent = `{{${header}}}`;
        item.append(marker);
        ui.fields.append(item);
      }
    } else {
      const item = document.createElement('li');
      item.textContent = text.fieldEmpty;
      ui.fields.append(item);
    }
    const error = state.error;
    let errorMessage = error ? (text.errors[error.code] ?? text.unexpected) : '';
    if (error?.details.record) errorMessage += ` ${text.position(error.details.record, error.details.column)}`;
    if (error?.details.position) errorMessage += ` ${text.templatePosition(error.details.position)}`;
    ui['validation-error'].textContent = errorMessage;
    ui['validation-error'].hidden = !error;
    const sourceError = Boolean(error && ['FILE_TOO_LARGE', 'INVALID_UTF8', 'CSV_SYNTAX', 'ROW_WIDTH', 'HEADER_INVALID', 'ROW_LIMIT', 'COLUMN_LIMIT'].includes(error.code));
    ui.csv.setAttribute('aria-invalid', String(sourceError && !fileAttempt));
    ui['csv-file'].setAttribute('aria-invalid', String(sourceError && Boolean(fileAttempt)));
    ui.template.setAttribute('aria-invalid', String(Boolean(error && ['TEMPLATE_TOO_LARGE', 'TEMPLATE_SYNTAX', 'UNKNOWN_FIELD'].includes(error.code))));
    ui['unknown-fields'].replaceChildren();
    ui['unknown-fields'].hidden = error?.code !== 'UNKNOWN_FIELD';
    if (error?.code === 'UNKNOWN_FIELD') {
      const heading = document.createElement('p');
      heading.textContent = text.unknownTitle;
      const list = document.createElement('ul');
      for (const field of error.details.fields) {
        const item = document.createElement('li');
        const code = document.createElement('code');
        code.textContent = `{{${field}}}`;
        item.append(code);
        list.append(item);
      }
      ui['unknown-fields'].append(heading, list);
    }
    ui.missing.replaceChildren();
    if (state.compiled) {
      const summary = document.createElement('p');
      summary.textContent = state.missing.totalCells ? text.missingTitle(format(state.missing.totalCells)) : text.noMissing;
      ui.missing.append(summary);
      if (state.missing.totalCells) {
        const list = document.createElement('ul');
        for (const item of state.missing.byField) {
          const row = document.createElement('li');
          row.textContent = text.missingLine(item.field, format(item.count), item.rowIndexes.map(format).join(', '), item.count > 20 ? format(item.count - 20) : 0);
          list.append(row);
        }
        ui.missing.append(list);
      }
    }
    ui['literal-warning'].hidden = !state.compiled || state.compiled.fields.length > 0;
    ui['blank-warning'].hidden = !state.allowBlank || !state.missing.totalCells;
    ui['blank-warning'].textContent = state.allowBlank && state.missing.totalCells ? text.blankWarning(format(state.missing.totalCells)) : '';
    ui['stale-notice'].hidden = !state.stale;
    ui.generate.disabled = !state.valid || state.phase === 'generating';
    ui.generate.textContent = state.phase === 'generating' ? text.generating(format(state.progress?.completed ?? 0)) : state.source?.rows.length ? text.generate(format(state.source.rows.length)) : text.generateIdle;
    ui.generate.setAttribute('aria-busy', String(state.phase === 'generating'));
    ui.cancel.hidden = state.phase !== 'generating' && !state.pendingRead;
    let message = text.idle;
    if (state.pendingRead) message = text.loading;
    else if (state.phase === 'generating') message = text.running(format(state.progress.completed), format(state.progress.total));
    else if (error) message = `! ${text.errors[error.code] ?? text.unexpected}`;
    else if (state.result) message = `✓ ${text.success(format(state.result.records.length))}`;
    else if (state.source && !state.source.rows.length) message = text.empty;
    else if (state.valid) message = `✓ ${text.ready(format(state.source.rows.length))}`;
    else if (state.phase === 'template-ready') message = text.templateReady;
    ui.status.textContent = message;
    ui.status.dataset.tone = error ? 'warning' : state.result || state.valid ? 'success' : 'info';
    paintPreview(state);
  }
  function setPastedSource(label = text.pasted) {
    fileAttempt = null;
    ui['csv-file'].value = '';
    const token = session.beginSource(label);
    if (ui.csv.value.length > session.limits.maxBytes) return session.rejectSource('FILE_TOO_LARGE', token);
    session.acceptSource(new TextEncoder().encode(ui.csv.value), token);
  }
  ui.csv.addEventListener('input', () => setPastedSource());
  ui['reuse-paste'].addEventListener('click', () => setPastedSource());
  ui['csv-file'].addEventListener('change', async () => {
    const file = ui['csv-file'].files?.[0];
    if (!file) return;
    const attempt = {};
    fileAttempt = attempt;
    const token = session.beginSource(file.name);
    const finish = accepted => {
      if (fileAttempt !== attempt || token !== session.getGeneration()) return;
      if (accepted) {
        // Preserve edits until this exact file has decoded and passed CSV validation.
        ui.csv.value = '';
        fileAttempt = null;
      } else ui['csv-file'].value = '';
      paint(session.getState());
    };
    if (file.size > session.limits.maxBytes) {
      session.rejectSource('FILE_TOO_LARGE', token);
      finish(false);
      return;
    }
    try { finish(session.acceptSource(new Uint8Array(await file.arrayBuffer()), token)); }
    catch { session.rejectSource('CSV_SYNTAX', token); finish(false); }
  });
  const clearPendingFileSelection = () => {
    if (fileAttempt && session.getState().pendingRead) ui['csv-file'].value = '';
  };
  ui.template.addEventListener('input', () => { clearPendingFileSelection(); session.setTemplate(ui.template.value); });
  ui['allow-blank'].addEventListener('change', () => { clearPendingFileSelection(); session.setAllowBlank(ui['allow-blank'].checked); });
  ui.generate.addEventListener('click', () => session.generate());
  ui.cancel.addEventListener('click', () => { clearPendingFileSelection(); session.cancel(); });
  function clearPage() {
    fileAttempt = null;
    ui.csv.value = '';
    ui['csv-file'].value = '';
    ui.template.value = '';
    ui['allow-blank'].checked = false;
    session.reset();
  }
  ui.reset.addEventListener('click', clearPage);
  window.addEventListener('pagehide', clearPage);
  ui.sample.addEventListener('click', () => {
    clearPage();
    ui.csv.value = language === 'en' ? 'Name,ID,Time\r\nAlex,001,10:00\r\nSam,002,11:00\r\nRobin,003,12:00' : '姓名,編號,時間\r\n小王,001,10:00\r\n小林,002,11:00\r\n小陳,003,12:00';
    ui.template.value = language === 'en' ? 'Hello {{Name}},\nYour event ID is {{ID}}. Please arrive at {{Time}}.\nSee you there!' : '您好{{姓名}}，\n您的活動編號是{{編號}}，請於{{時間}}報到。\n期待與您相見！';
    session.setTemplate(ui.template.value);
    setPastedSource(text.sampleName);
  });
  const navigate = index => {
    const total = session.getState().result?.records.length ?? 0;
    if (!Number.isInteger(index) || index < 0 || index >= total) return;
    rowIndex = index;
    clearCopy();
    paintPreview(session.getState());
  };
  ui.previous.addEventListener('click', () => navigate(rowIndex - 1));
  ui.next.addEventListener('click', () => navigate(rowIndex + 1));
  ui.jump.addEventListener('click', () => navigate(Number(ui['row-number'].value) - 1));
  ui.copy.addEventListener('click', async () => {
    const state = session.getState();
    const record = state.result?.records[rowIndex];
    if (!record) return;
    const generation = session.getGeneration();
    const index = rowIndex;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('COPY_UNAVAILABLE');
      await navigator.clipboard.writeText(record.text);
      if (generation === session.getGeneration() && index === rowIndex) ui['copy-status'].textContent = text.copied(format(index + 1));
    } catch {
      if (generation !== session.getGeneration() || index !== rowIndex) return;
      ui['copy-status'].textContent = text.copyFailed;
      ui['copy-fallback'].hidden = false;
      ui['copy-text'].value = record.text;
    }
  });
  ui['select-text'].addEventListener('click', () => {
    if (!ui['copy-fallback'].hidden) { ui['copy-text'].focus(); ui['copy-text'].select(); }
  });
  window.addEventListener('pageshow', event => { if (event.persisted) clearPage(); });
  clearPage();
  return { session, clearPage };
}

if (typeof document !== 'undefined') mountApp({ document, window, navigator });
