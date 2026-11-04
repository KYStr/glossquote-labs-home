import { inspectRasterHeader, validateFileSize } from './core/format-headers.mjs';
import { mapPointerRect } from './core/geometry.mjs';
import { initialState, reduceEditorState, jobToken, isCurrentJob } from './core/session.mjs';

export const downloadName = 'glossquote-image-redacted.png';

export function displayFilename(name) {
  if (typeof name !== 'string') return '';
  return Array.from(name).slice(0, 512).join('').replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, value => `U+${value.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
}
export function paintComposite(canvas, bitmap, source, masks) {
  try {
    canvas.width = source.visualWidth; canvas.height = source.visualHeight;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return { ok: false, error: { code: 'RESOURCE_UNAVAILABLE' } };
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over'; context.globalAlpha = 1;
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over'; context.globalAlpha = 1;
    context.fillStyle = '#000000';
    for (const mask of masks) context.fillRect(mask.x, mask.y, mask.width, mask.height);
    return { ok: true };
  } catch { return { ok: false, error: { code: 'RESOURCE_UNAVAILABLE' } }; }
}

async function validateEncodedPng(blob, source) {
  if (!(blob instanceof Blob) || blob.type !== 'image/png' || !Number.isSafeInteger(blob.size) || blob.size < 45) return false;
  // The trusted native serializer may produce a PNG larger than the INPUT byte limit.
  // Read only IHDR here; the actual preview must subsequently load at the same dimensions.
  const bytes = new Uint8Array(await blob.slice(0, 33).arrayBuffer());
  if (bytes.length !== 33 || ![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(8) === 13 && String.fromCharCode(...bytes.subarray(12, 16)) === 'IHDR' &&
    view.getUint32(16) === source.visualWidth && view.getUint32(20) === source.visualHeight;
}

export function createEditorController(options) {
  const surface = options.canvas;
  const decode = options.decode ?? (typeof globalThis.createImageBitmap === 'function' ? ((file, settings) => globalThis.createImageBitmap(file, settings)) : null);
  const createCanvas = options.createCanvas ?? (() => document.createElement('canvas'));
  const createUrl = options.createUrl ?? (blob => URL.createObjectURL(blob));
  const revokeUrl = options.revokeUrl ?? (url => URL.revokeObjectURL(url));
  const defer = options.defer ?? (() => new Promise(resolve => globalThis.setTimeout(resolve, 0)));
  const onChange = options.onChange ?? (() => {});
  const resetInput = options.resetInput ?? (() => {});
  let state = initialState(), bitmap = null, pendingSource = null, sourceName = '', clearMasksPending = false, id = 0, result = null;
  const urls = new Set(), workCanvases = new Set();
  const closeBitmap = value => { try { value?.close(); } catch { /* Release best effort, without exposing a native exception. */ } };
  const shrink = canvas => { try { canvas.width = 1; canvas.height = 1; } catch { /* No native exception leaves the controller. */ } };
  const notify = () => onChange({ state, sourceName, replacePending: pendingSource !== null, clearMasksPending });
  function releaseOutput() {
    result = null;
    options.clearPreview?.();
    for (const url of urls) { try { revokeUrl(url); } catch { /* Never expose a native error. */ } }
    urls.clear();
  }
  function retireCanvas(canvas) { if (canvas) { shrink(canvas); workCanvases.delete(canvas); } }
  function clearDraft() { options.presentDraft?.(null); }
  function dispatch(action, redraw = false) {
    clearDraft();
    const previous = state;
    state = reduceEditorState(state, action);
    if (state.jobId !== previous.jobId || (previous.output && !state.output)) {
      releaseOutput();
      for (const canvas of workCanvases) retireCanvas(canvas);
    }
    if (redraw && bitmap && state.source) {
      const result = paintComposite(surface, bitmap, state.source, state.masks);
      if (!result.ok) state = reduceEditorState(state, { type: 'report-error', code: result.error.code, path: '' });
    }
    notify();
  }
  function releaseSource() {
    closeBitmap(bitmap); bitmap = null; sourceName = '';
    shrink(surface);
  }
  function reportError(code, path = '') { dispatch({ type: 'report-error', code, path }); }
  async function loadSource(candidate) {
    pendingSource = null; clearMasksPending = false;
    releaseSource();
    dispatch({ type: 'select-start' }); resetInput();
    const token = jobToken(state);
    let decoded = null;
    try {
      if (!(candidate instanceof Blob)) { dispatch({ type: 'select-failure', token, code: 'FILE_REQUIRED' }); return; }
      const size = validateFileSize(candidate.size);
      if (!size.ok) { candidate = null; dispatch({ type: 'select-failure', token, code: size.error.code }); return; }
      const safeName = displayFilename(candidate.name);
      let buffer;
      try { buffer = await candidate.arrayBuffer(); }
      catch { candidate = null; if (isCurrentJob(state, token)) dispatch({ type: 'select-failure', token, code: 'HEADER_UNSAFE' }); return; }
      if (!isCurrentJob(state, token)) { buffer = null; candidate = null; return; }
      const header = inspectRasterHeader(new Uint8Array(buffer)); buffer = null;
      if (!header.ok) { candidate = null; dispatch({ type: 'select-failure', token, code: header.error.code }); return; }
      dispatch({ type: 'header-passed', token });
      if (typeof decode !== 'function') { candidate = null; dispatch({ type: 'select-failure', token, code: 'RESOURCE_UNAVAILABLE' }); return; }
      const decoding = decode(candidate, { imageOrientation: 'from-image' }); candidate = null;
      decoded = await decoding;
      if (!isCurrentJob(state, token)) { closeBitmap(decoded); return; }
      if (!decoded || decoded.width !== header.visualWidth || decoded.height !== header.visualHeight) {
        closeBitmap(decoded); decoded = null;
        dispatch({ type: 'select-failure', token, code: 'DECODE_DIMENSION_MISMATCH' }); return;
      }
      const { ok, ...source } = header;
      const painted = paintComposite(surface, decoded, source, []);
      if (!painted.ok) {
        closeBitmap(decoded); decoded = null; shrink(surface);
        dispatch({ type: 'select-failure', token, code: painted.error.code }); return;
      }
      bitmap = decoded; decoded = null; sourceName = safeName;
      dispatch({ type: 'select-success', token, source });
    } catch {
      candidate = null; closeBitmap(decoded);
      if (isCurrentJob(state, token)) { shrink(surface); dispatch({ type: 'select-failure', token, code: 'DECODE_FAILED' }); }
    }
  }
  function requestSource(candidate) {
    clearDraft();
    resetInput();
    if (state.phase === 'disposed') return Promise.resolve();
    if (state.masks.length) { pendingSource = candidate; clearMasksPending = false; notify(); return Promise.resolve(); }
    return loadSource(candidate);
  }
  function confirmSource() { const candidate = pendingSource; pendingSource = null; return candidate ? loadSource(candidate) : Promise.resolve(); }
  function cancelSource() { pendingSource = null; notify(); }
  function addMask(rect) {
    id++;
    dispatch({ type: 'add-mask', mask: { id: `mask-${id}`, x: rect.x, y: rect.y, width: rect.width, height: rect.height } }, true);
  }
  function updateMask(rect) {
    dispatch({ type: 'update-mask', mask: { id: state.selectedId ?? '', x: rect.x, y: rect.y, width: rect.width, height: rect.height } }, true);
  }
  function addPointer(start, end, imageRect) {
    clearDraft();
    if (!state.source) return;
    const mapped = mapPointerRect(start, end, imageRect, state.source.visualWidth, state.source.visualHeight);
    if (mapped.ok) addMask(mapped.rect); else reportError(mapped.error.code);
  }
  function redraw() { if (bitmap && state.source) paintComposite(surface, bitmap, state.source, state.masks); }
  function showDraft(start, end, imageRect) {
    if (!state.source || !bitmap) { clearDraft(); return; }
    const mapped = mapPointerRect(start, end, imageRect, state.source.visualWidth, state.source.visualHeight);
    // Draft is a display-only rectangle. Pointer movement never touches the full-size bitmap canvas.
    options.presentDraft?.(mapped.ok ? { rect: mapped.rect, visualWidth: state.source.visualWidth, visualHeight: state.source.visualHeight } : null);
  }
  function requestClearMasks() { clearDraft(); if (state.masks.length) { pendingSource = null; clearMasksPending = true; notify(); } }
  function confirmClearMasks() { if (clearMasksPending) { clearMasksPending = false; dispatch({ type: 'clear-masks' }, true); } }
  function cancelClearMasks() { clearMasksPending = false; notify(); }
  async function generate() {
    dispatch({ type: 'generate-start' });
    if (state.phase !== 'generating') return;
    const token = jobToken(state), source = state.source, masks = state.masks;
    let canvas = null;
    try {
      await defer();
      if (!isCurrentJob(state, token)) return;
      canvas = createCanvas(); workCanvases.add(canvas);
      const painted = paintComposite(canvas, bitmap, source, masks);
      if (!painted.ok) { dispatch({ type: 'generate-failure', token, code: painted.error.code }); return; }
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!isCurrentJob(state, token)) return;
      if (blob === null) { dispatch({ type: 'generate-failure', token, code: 'ENCODE_FAILED' }); return; }
      const valid = await validateEncodedPng(blob, source);
      if (!isCurrentJob(state, token)) return;
      if (!valid) { dispatch({ type: 'generate-failure', token, code: 'OUTPUT_INVALID' }); return; }
      const url = createUrl(blob); urls.add(url);
      const current = { blob, url, token };
      result = current;
      dispatch({ type: 'generate-success', token, output: { width: source.visualWidth, height: source.visualHeight, mime: blob.type, bytes: blob.size } });
      options.presentPreview?.({
        url,
        onLoad: dimensions => {
          if (result !== current || !isCurrentJob(state, token)) return;
          dispatch({ type: dimensions?.width === source.visualWidth && dimensions?.height === source.visualHeight ? 'preview-loaded' : 'preview-failure', token });
        },
        onError: () => { if (result === current && isCurrentJob(state, token)) dispatch({ type: 'preview-failure', token }); },
      });
    } catch {
      if (isCurrentJob(state, token)) {
        if (state.output) dispatch({ type: 'preview-failure', token });
        else dispatch({ type: 'generate-failure', token, code: 'ENCODE_FAILED' });
      }
    } finally {
      // This local canvas belongs to this job only. Late A cleanup cannot touch B.
      retireCanvas(canvas);
    }
  }
  function download() {
    if (!result || !state.output?.previewLoaded || !isCurrentJob(state, result.token)) return false;
    try { options.requestDownload?.(result.url, downloadName); return true; }
    catch { reportError('OUTPUT_INVALID'); return false; }
  }
  function clean(type) {
    pendingSource = null; clearMasksPending = false;
    releaseSource(); resetInput(); dispatch({ type });
  }
  function pageshow(persisted) { if (persisted) { clean('clear-source'); dispatch({ type: 'pageshow', persisted: true }); } }
  notify();
  return {
    getState: () => state, requestSource, confirmSource, cancelSource, addMask, updateMask, addPointer, redraw, showDraft, clearDraft,
    selectMask: selected => dispatch({ type: 'select-mask', id: selected }),
    deleteSelected: () => dispatch({ type: 'delete-mask', id: state.selectedId }, true),
    undoMask: () => dispatch({ type: 'undo-mask' }, true), requestClearMasks, confirmClearMasks, cancelClearMasks,
    invalidateOutput: () => dispatch({ type: 'invalidate-output' }), reportError,
    clearSource: () => clean('clear-source'), pagehide: () => clean('pagehide'), pageshow,
    generate, cancelGeneration: () => dispatch({ type: 'cancel-generation' }), download,
  };
}
