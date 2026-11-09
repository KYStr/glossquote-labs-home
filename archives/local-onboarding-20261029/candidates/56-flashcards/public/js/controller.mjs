import { parseCsv, parseCards, decodeUtf8 } from './core/csv.mjs';
import { createSession, reduceSession } from './core/deck.mjs';
import { CardError, LIMITS, parseDeckJson, fail } from './core/schema.mjs';
import { serializeDeck, renderStudyHtml } from './core/export.mjs';

export function readLocalFile(file) {
  const reader = new FileReader();
  const promise = new Promise((resolve, reject) => {
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(new CardError('FILE_READ_FAILED', 'file'));
    reader.onabort = () => reject(new CardError('CANCELLED', 'file'));
    reader.readAsArrayBuffer(file);
  });
  return { promise, cancel: () => { if (reader.readyState === 1) reader.abort(); } };
}

export function createController({ locale = 'zh-Hant', onChange = () => {}, readFile = readLocalFile,
  randomSeed = () => { const values = new Uint32Array(1); globalThis.crypto.getRandomValues(values); return values[0] || 1; },
  makeUrl = text => URL.createObjectURL(text), revokeUrl = url => URL.revokeObjectURL(url),
  makeBlob = (text, type) => new Blob([text], { type }), setTimer = (fn, delay) => setTimeout(fn, delay), clearTimer = id => clearTimeout(id),
} = {}) {
  let generation = 0, activeRead = null, disposed = false;
  const urls = new Map();
  const initial = () => ({ source: '', settings: { header: true, questionColumn: 0, answerColumn: 1, shuffle: false, seed: '' }, columns: [], session: null, pendingImport: null, pendingImportSource: null, confirmation: null, prepared: null, phase: 'idle', error: null, message: 'idle', readingKind: null });
  let state = initial();
  const emit = () => { if (!disposed) onChange(state); };
  function clearUrls() { for (const [url, timer] of urls) { clearTimer(timer); revokeUrl(url); } urls.clear(); }
  function invalidate() {
    generation++;
    const reader = activeRead; activeRead = null;
    if (reader) { try { reader.cancel(); } catch { /* The generation guard still rejects late results. */ } }
    clearUrls();
    state = { ...state, prepared: null, error: null, pendingImport: null, pendingImportSource: null, confirmation: null, readingKind: null };
    return generation;
  }
  function report(error, field = 'source') {
    clearUrls();
    state = { ...state, prepared: null, phase: 'error', message: 'invalid', error: error instanceof CardError ? { code: error.code, field: error.field, record: error.record } : { code: 'UNEXPECTED', field, record: null } };
    emit(); return false;
  }
  function blocked() { return disposed || state.phase === 'running' || !!state.pendingImport || !!state.confirmation; }
  function seed() {
    if (state.settings.seed === '') return randomSeed();
    if (!/^[0-9]{1,10}$/.test(state.settings.seed)) fail('INVALID_SEED', 'seed');
    const value = Number(state.settings.seed);
    if (value < 1 || value > 4294967295) fail('INVALID_SEED', 'seed');
    return value;
  }
  function sourceChanged(source) {
    invalidate();
    state = { ...state, source, columns: [], session: null, phase: source ? 'editing' : 'idle', message: source ? 'editing' : 'idle' };
    emit();
  }
  function setSource(source) { if (disposed || state.session) return false; sourceChanged(source); return true; }
  function setSetting(key, value) {
    if (disposed || state.session || !['header', 'questionColumn', 'answerColumn', 'shuffle', 'seed'].includes(key)) return false;
    invalidate(); state = { ...state, settings: { ...state.settings, [key]: value }, columns: key === 'header' ? state.columns.map(column => ({ ...column, label: '' })) : state.columns, phase: 'editing', message: 'editing' }; emit(); return true;
  }
  function inspect() {
    if (blocked() || state.session) return false;
    invalidate();
    try {
      const rows = parseCsv(state.source);
      state = { ...state, columns: rows[0].map((value, index) => ({ index, label: state.settings.header ? [...value.slice(0, 160)].slice(0, 80).join('') : '' })), phase: 'editing', message: 'columnsReady' };
      emit(); return true;
    } catch (error) { return report(error); }
  }
  function start() {
    if (blocked() || state.session) return false;
    invalidate();
    try {
      const cards = parseCards(state.source, state.settings);
      const value = state.settings.shuffle ? seed() : 1;
      state = { ...state, session: createSession(cards, { seed: value, shuffle: state.settings.shuffle }), settings: { ...state.settings, seed: state.settings.shuffle ? String(value) : state.settings.seed }, phase: 'ready', message: 'started' };
      emit(); return true;
    } catch (error) { return report(error); }
  }
  function dispatch(event) {
    if (blocked() || !state.session) return false;
    invalidate();
    try {
      state = { ...state, session: reduceSession(state.session, event), phase: 'ready', message: event.type === 'setMode' ? 'batchChanged' : 'progressChanged' };
      emit(); return true;
    } catch (error) { return report(error); }
  }
  function setPracticeSeed(value) {
    if (blocked() || !state.session) return false;
    invalidate(); state = { ...state, settings: { ...state.settings, seed: value }, session: { ...state.session, revealed: false }, phase: 'ready', message: 'seedChanged' }; emit(); return true;
  }
  function reshuffle() { if (blocked() || !state.session) return false; try { const value = seed(); state = { ...state, settings: { ...state.settings, seed: String(value) } }; return dispatch({ type: 'reshuffle', seed: value }); } catch (error) { invalidate(); return report(error); } }
  function requestConfirmation(type) {
    if (blocked() || !state.session || !['reset', 'edit'].includes(type)) return false;
    invalidate(); state = { ...state, confirmation: type, phase: 'confirm', message: 'confirm' }; emit(); return true;
  }
  function confirm() {
    const type = state.confirmation;
    if (!type || disposed) return false;
    invalidate();
    if (type === 'edit') { state = { ...state, session: null, phase: 'editing', message: 'editing' }; emit(); return true; }
    state = { ...state, session: reduceSession(state.session, { type: 'reset' }), phase: 'ready', message: 'resetDone' }; emit(); return true;
  }
  function cancel() {
    if (disposed) return;
    invalidate(); state = { ...state, phase: state.session ? 'ready' : (state.source ? 'editing' : 'idle'), message: 'cancelled' }; emit();
  }
  function previewImport(text) {
    if (disposed) return false;
    invalidate();
    try { state = { ...state, pendingImport: parseDeckJson(text), pendingImportSource: 'paste', phase: 'importPreview', message: 'importPreview' }; emit(); return true; }
    catch (error) { return report(error instanceof CardError ? new CardError(error.code, 'json', error.record) : error, 'json'); }
  }
  function confirmImport() {
    if (!state.pendingImport || disposed) return false;
    const incoming = state.pendingImport;
    invalidate();
    const quote = text => `"${text.replace(/"/g, '""')}"`;
    const source = `question,answer\n${incoming.cards.map(card => `${quote(card.question)},${quote(card.answer)}`).join('\n')}`;
    state = { ...state, source, settings: { header: true, questionColumn: 0, answerColumn: 1, shuffle: false, seed: '' }, columns: [], session: createSession(incoming.cards, { known: incoming.known }), phase: 'ready', message: 'imported' };
    emit(); return true;
  }
  async function loadFile(file, kind) {
    if (disposed || !['csv', 'json'].includes(kind) || (kind === 'csv' && state.session)) return false;
    const token = invalidate();
    if (kind === 'csv') state = { ...state, session: null, columns: [] };
    const limit = kind === 'csv' ? LIMITS.csvBytes : LIMITS.jsonBytes;
    if (!file || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > limit) return report(new CardError('SOURCE_TOO_LARGE', kind === 'csv' ? 'file' : 'json'));
    state = { ...state, phase: 'running', readingKind: kind, message: 'running' }; emit();
    try {
      const task = readFile(file); activeRead = task;
      const bytes = await task.promise;
      if (disposed || token !== generation) return false;
      activeRead = null;
      const text = decodeUtf8(bytes, limit);
      if (kind === 'csv') { state = { ...state, source: text, phase: 'editing', readingKind: null, message: 'fileLoaded' }; emit(); }
      else { state = { ...state, pendingImport: parseDeckJson(text), pendingImportSource: 'file', phase: 'importPreview', readingKind: null, message: 'importPreview' }; emit(); }
      return true;
    } catch (error) {
      if (disposed || token !== generation) return false;
      activeRead = null; state = { ...state, readingKind: null };
      return report(error instanceof CardError ? new CardError(error.code, kind === 'csv' ? 'file' : 'json', error.record) : new CardError('FILE_READ_FAILED', kind === 'csv' ? 'file' : 'json'));
    }
  }
  function invalidateOutput() {
    if (disposed) return;
    invalidate(); state = { ...state, phase: state.session ? 'ready' : (state.source ? 'editing' : 'idle'), message: 'outputChanged' }; emit();
  }
  function prepare(type) {
    if (blocked() || !state.session) return false;
    invalidate();
    try {
      if (!['json', 'html'].includes(type)) fail('INVALID_EVENT');
      const text = type === 'json' ? serializeDeck(state.session.cards, state.session.known) : renderStudyHtml(state.session.cards, { locale });
      state = { ...state, prepared: { type, text, bytes: new TextEncoder().encode(text).byteLength, filename: type === 'json' ? 'flashcards-deck.json' : 'flashcards-study.html', mime: type === 'json' ? 'application/json;charset=utf-8' : 'text/html;charset=utf-8' }, phase: 'ready', message: 'outputReady' };
      emit(); return true;
    } catch (error) { return report(error); }
  }
  function download() {
    if (blocked() || !state.prepared || state.prepared.downloadDisabled) return null;
    try {
      const output = state.prepared;
      const url = makeUrl(makeBlob(output.text, output.mime));
      urls.set(url, null);
      const timer = setTimer(() => { revokeUrl(url); urls.delete(url); }, 30000);
      urls.set(url, timer);
      state = { ...state, message: 'downloadHandedOff' }; emit();
      return { url, filename: output.filename };
    } catch {
      clearUrls();
      state = { ...state, prepared: { ...state.prepared, downloadDisabled: true }, phase: 'error', message: 'invalid', error: { code: 'DOWNLOAD_UNAVAILABLE', field: 'output', record: null } };
      emit(); return null;
    }
  }
  function clear() { if (disposed) return; invalidate(); state = initial(); emit(); }
  function dispose() { invalidate(); state = initial(); disposed = true; }
  function resume() { if (disposed) { disposed = false; state = initial(); emit(); } }
  return { snapshot: () => state, setSource, setSetting, inspect, start, dispatch, setPracticeSeed, reshuffle, requestConfirmation, confirm, cancel, previewImport, confirmImport, loadFile, invalidateOutput, prepare, download, clear, dispose, resume };
}
