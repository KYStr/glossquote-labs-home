import { parseCsv } from './core/csv.mjs';
import { compileTemplate, inspectMissing } from './core/template.mjs';
import { renderBatch } from './core/render.mjs';
import { serializeBatch } from './core/export.mjs';
import { LIMITS, ToolError } from './core/errors.mjs';

/** Memory-only session. Inject URL/Blob capabilities to test ownership without a browser. */
export function createSession({
  language = 'zh-Hant', onChange = () => {},
  createUrl = blob => URL.createObjectURL(blob), revokeUrl = url => URL.revokeObjectURL(url),
  makeBlob = (bytes, type) => new Blob([bytes], { type }), render = renderBatch, serialize = serializeBatch,
} = {}) {
  const initial = () => ({ phase: 'idle', source: null, sourceLabel: '', template: '', allowBlank: false,
    compiled: null, missing: { byField: [], totalCells: 0 }, error: null,
    result: null, urls: null, progress: null, stale: false, pendingRead: false, valid: false });
  let state = initial();
  let generation = 0;
  let controller = null;
  const emit = () => onChange(state);
  function invalidate() {
    const hadWork = Boolean(state.result || state.phase === 'generating');
    generation++;
    controller?.abort();
    controller = null;
    if (state.urls) for (const url of Object.values(state.urls)) revokeUrl(url);
    Object.assign(state, { result: null, urls: null, progress: null, error: null, pendingRead: false, valid: false });
    if (hadWork) { state.stale = true; state.phase = 'stale'; }
    return generation;
  }
  function inspect() {
    state.compiled = null;
    state.missing = { byField: [], totalCells: 0 };
    state.valid = false;
    if (!state.source) {
      state.phase = state.template.length ? 'template-ready' : 'idle';
      return;
    }
    state.phase = 'validating';
    try {
      state.compiled = compileTemplate(state.template, state.source.headers);
      state.missing = inspectMissing(state.source.rows, state.compiled.fields);
      if (state.missing.totalCells && !state.allowBlank) throw new ToolError('MISSING_VALUES', state.missing);
      state.error = null;
      state.valid = state.source.rows.length > 0;
      state.phase = state.valid ? 'ready' : 'needs-input';
    } catch (error) {
      state.error = error instanceof ToolError ? error : new ToolError('TEMPLATE_SYNTAX');
      state.phase = 'needs-input';
    }
  }
  function beginSource(label = '') {
    const token = invalidate();
    Object.assign(state, { source: null, sourceLabel: label, compiled: null, missing: { byField: [], totalCells: 0 }, phase: 'validating', pendingRead: true });
    emit();
    return token;
  }
  function acceptSource(bytes, token) {
    if (token !== generation || !state.pendingRead) return false;
    state.pendingRead = false;
    let parsed;
    try {
      parsed = parseCsv(bytes);
    } catch (error) {
      state.source = null;
      state.error = error instanceof ToolError ? error : new ToolError('CSV_SYNTAX');
      state.phase = 'needs-input';
      emit();
      return false;
    }
    // A successful CSV commit is separate from template/missing-value readiness.
    state.source = parsed;
    state.phase = 'source-loaded';
    inspect();
    emit();
    return true;
  }
  function rejectSource(code, token) {
    if (token !== generation || !state.pendingRead) return;
    state.pendingRead = false;
    state.error = new ToolError(code);
    state.phase = 'needs-input';
    emit();
  }
  function setTemplate(value) {
    invalidate();
    state.template = value;
    inspect();
    emit();
  }
  function setAllowBlank(value) {
    invalidate();
    state.allowBlank = value === true;
    inspect();
    emit();
  }
  async function generate() {
    if (!state.valid || state.pendingRead || state.phase === 'generating') return false;
    const token = invalidate();
    const current = () => token === generation;
    const workController = new AbortController();
    controller = workController;
    const { source, template, allowBlank, compiled } = state;
    state.phase = 'generating';
    state.progress = { completed: 0, total: source.rows.length };
    emit();
    const pendingUrls = [];
    try {
      const batch = await render(source.rows, compiled, {
        allowBlank, signal: workController.signal, isCurrent: current,
        onProgress: progress => { if (current()) { state.progress = progress; emit(); } },
      });
      if (!current()) return false;
      const output = serialize(batch, { template, headers: source.headers, allowBlank, language });
      if (!current()) return false;
      // Both exports have passed the combined cap before either Blob is created.
      pendingUrls.push(createUrl(makeBlob(output.txt, 'text/plain;charset=utf-8')));
      pendingUrls.push(createUrl(makeBlob(output.json, 'application/json;charset=utf-8')));
      if (!current()) { pendingUrls.forEach(revokeUrl); return false; }
      state.urls = { txt: pendingUrls[0], json: pendingUrls[1] };
      state.result = { records: batch.records, combinedBytes: output.combinedBytes, counts: output.counts };
      state.phase = 'preview';
      state.stale = false;
      state.progress = null;
      state.valid = true;
      controller = null;
      emit();
      return true;
    } catch (error) {
      pendingUrls.forEach(revokeUrl);
      if (!current()) return false;
      state.result = null;
      state.urls = null;
      state.error = error instanceof ToolError ? error : { code: null, details: {} };
      state.phase = 'needs-input';
      state.progress = null;
      state.valid = Boolean(state.compiled && state.source?.rows.length && (!state.missing.totalCells || state.allowBlank));
      controller = null;
      emit();
      return false;
    }
  }
  function cancel() {
    invalidate();
    inspect();
    state.error = new ToolError('CANCELLED');
    state.phase = 'needs-input';
    emit();
  }
  function reset() {
    invalidate();
    state = initial();
    emit();
  }
  return { getState: () => state, getGeneration: () => generation, beginSource, acceptSource, rejectSource,
    setTemplate, setAllowBlank, generate, cancel, reset, dispose: reset, limits: LIMITS };
}
