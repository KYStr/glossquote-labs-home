import { createEditorController, downloadName } from './controller.mjs';
import zh from './locales/zh-Hant.mjs';
import en from './locales/en.mjs';

const locale = document.documentElement.lang === 'en' ? en : zh;
const numbers = new Intl.NumberFormat(locale.language);
const elements = Object.fromEntries([
  'source-file', 'source-label', 'clear-source', 'source-info', 'source-name', 'replace-confirm', 'replace-cancel', 'replace-accept',
  'status', 'error', 'empty-state', 'image-stage', 'editor-canvas', 'draft-mask', 'mask-count', 'coordinate-fields', 'coordinate-heading',
  'mask-form', 'mask-x', 'mask-y', 'mask-width', 'mask-height', 'add-mask', 'update-mask', 'delete-mask', 'no-masks', 'mask-list',
  'undo-mask', 'clear-masks', 'masks-confirm', 'masks-cancel', 'masks-accept', 'cancel-generation', 'generate',
  'output-section', 'output-image', 'output-info', 'download',
].map(id => [id, document.getElementById(id)]));
const fieldKeys = ['x', 'y', 'width', 'height'];
const format = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => typeof values[key] === 'number' ? numbers.format(values[key]) : values[key]);
let controller, selectionSignature = '', renderedMasks = '', draft = null;

function render({ state, sourceName, replacePending, clearMasksPending }) {
  const loaded = state.source !== null;
  const busy = ['checking-header', 'decoding'].includes(state.phase);
  if (draft && (draft.jobId !== state.jobId || replacePending || clearMasksPending)) draft = null;
  elements['source-name'].textContent = sourceName;
  elements['source-name'].hidden = !sourceName;
  elements['source-info'].textContent = loaded ? format(locale.sourceInfo, { width: state.source.visualWidth, height: state.source.visualHeight, format: state.source.format.toUpperCase() }) : '';
  elements['replace-confirm'].hidden = !replacePending;
  elements['masks-confirm'].hidden = !clearMasksPending;
  elements['clear-source'].disabled = state.phase === 'idle' && !replacePending;
  elements['editor-canvas'].hidden = !loaded;
  elements['image-stage'].hidden = !loaded;
  elements['image-stage'].style.width = loaded ? `${state.source.visualWidth}px` : '';
  elements['empty-state'].hidden = loaded;
  elements['editor-canvas'].setAttribute('aria-busy', String(busy));
  elements['coordinate-fields'].disabled = !loaded;
  elements['add-mask'].disabled = !loaded;
  for (const id of ['update-mask', 'delete-mask']) elements[id].disabled = !loaded || !state.selectedId;
  for (const id of ['undo-mask', 'clear-masks']) elements[id].disabled = !state.masks.length;
  elements.generate.disabled = !loaded || !state.masks.length || state.phase === 'generating';
  elements.generate.classList.toggle('primary', loaded && !state.output);
  elements['source-label'].classList.toggle('primary', !loaded);
  elements['cancel-generation'].disabled = state.phase !== 'generating';
  elements.download.disabled = !state.output?.previewLoaded;
  elements['mask-count'].textContent = format(locale.maskCount, { count: state.masks.length });
  elements['no-masks'].hidden = state.masks.length > 0;
  elements.error.hidden = !state.error;
  elements.error.textContent = state.error ? locale.errors[state.error.code] ?? locale.errors.HEADER_UNSAFE : '';
  for (const key of fieldKeys) elements[`mask-${key}`].setAttribute('aria-invalid', String(Boolean(state.error && (state.error.path === key || state.error.path.endsWith('.' + key)))));
  elements['source-file'].setAttribute('aria-invalid', String(Boolean(state.error && !loaded)));
  const selection = state.masks.find(mask => mask.id === state.selectedId);
  const signature = `${state.sourceRevision}:${state.selectedId}:${selection ? JSON.stringify(selection) : ''}`;
  if (signature !== selectionSignature) {
    selectionSignature = signature;
    for (const key of fieldKeys) elements[`mask-${key}`].value = String(selection?.[key] ?? (['width', 'height'].includes(key) ? 1 : 0));
  }
  elements['coordinate-heading'].textContent = selection ? locale.selectedHeading : locale.newHeading;
  const listSignature = JSON.stringify([state.masks, state.selectedId]);
  if (listSignature !== renderedMasks) {
    renderedMasks = listSignature;
    const existing = new Map(Array.from(elements['mask-list'].children, row => [row.firstElementChild.dataset.maskId, row]));
    state.masks.forEach((mask, index) => {
      const row = existing.get(mask.id) ?? document.createElement('li');
      const button = row.firstElementChild ?? document.createElement('button');
      existing.delete(mask.id);
      button.type = 'button'; button.dataset.maskId = mask.id;
      button.setAttribute('aria-pressed', String(mask.id === state.selectedId));
      button.textContent = format(locale.maskItem, { index: index + 1, ...mask }) + (mask.id === state.selectedId ? ` ${locale.selected}` : '');
      if (!row.firstElementChild) row.append(button);
      if (!row.parentElement) elements['mask-list'].append(row);
    });
    for (const row of existing.values()) row.remove();
  }
  let status = locale.idle;
  if (state.notice === 'cancelled') status = locale.cancelled;
  else if (state.notice === 'cleared') status = locale.cleared;
  else if (state.phase === 'checking-header') status = locale.checking;
  else if (state.phase === 'decoding') status = locale.decoding;
  else if (state.phase === 'generating') status = locale.generating;
  else if (state.output) status = state.output.previewLoaded ? format(locale.previewReady, state.output) : locale.previewLoading;
  else if (loaded) status = state.masks.length ? locale.ready : locale.noMask;
  if (elements.status.textContent !== status) elements.status.textContent = status;
  elements['output-section'].hidden = !state.output;
  elements['output-info'].textContent = state.output ? `${numbers.format(state.output.width)} × ${numbers.format(state.output.height)} px · ${state.output.mime} · ${numbers.format(state.output.bytes)} bytes` : '';
}

let detachPreview = () => {};
controller = createEditorController({
  canvas: elements['editor-canvas'], onChange: render,
  resetInput: () => { elements['source-file'].value = ''; },
  presentDraft: preview => {
    const overlay = elements['draft-mask'];
    overlay.hidden = !preview;
    if (!preview) { for (const key of ['left', 'top', 'width', 'height']) overlay.style.removeProperty(key); return; }
    const { rect, visualWidth, visualHeight } = preview;
    overlay.style.left = `${rect.x / visualWidth * 100}%`;
    overlay.style.top = `${rect.y / visualHeight * 100}%`;
    overlay.style.width = `${rect.width / visualWidth * 100}%`;
    overlay.style.height = `${rect.height / visualHeight * 100}%`;
  },
  clearPreview: () => { detachPreview(); detachPreview = () => {}; elements['output-image'].removeAttribute('src'); elements['output-image'].hidden = true; },
  presentPreview: ({ url, onLoad, onError }) => {
    detachPreview();
    const image = elements['output-image'];
    const loaded = () => onLoad({ width: image.naturalWidth, height: image.naturalHeight });
    image.addEventListener('load', loaded); image.addEventListener('error', onError);
    detachPreview = () => { image.removeEventListener('load', loaded); image.removeEventListener('error', onError); };
    image.hidden = false; image.src = url;
  },
  requestDownload: url => {
    const link = document.createElement('a');
    link.href = url; link.download = downloadName; link.hidden = true;
    document.body.append(link); link.click(); link.remove();
  },
});
elements['source-file'].disabled = typeof globalThis.createImageBitmap !== 'function';
if (elements['source-file'].disabled) controller.reportError('RESOURCE_UNAVAILABLE');

elements['source-file'].addEventListener('change', () => {
  cancelDraft();
  const files = elements['source-file'].files;
  if (files?.length === 1) void controller.requestSource(files[0]);
});
elements['clear-source'].addEventListener('click', () => { cancelDraft(); controller.clearSource(); });
elements['replace-cancel'].addEventListener('click', () => controller.cancelSource());
elements['replace-accept'].addEventListener('click', () => { cancelDraft(); void controller.confirmSource(); });
elements['clear-masks'].addEventListener('click', () => { cancelDraft(); controller.requestClearMasks(); });
elements['masks-cancel'].addEventListener('click', () => controller.cancelClearMasks());
elements['masks-accept'].addEventListener('click', () => controller.confirmClearMasks());
elements['undo-mask'].addEventListener('click', () => controller.undoMask());
elements['delete-mask'].addEventListener('click', () => controller.deleteSelected());
elements['mask-list'].addEventListener('click', event => {
  const button = event.target.closest('button[data-mask-id]');
  if (button) controller.selectMask(button.dataset.maskId);
});
function readCoordinates() {
  return Object.fromEntries(fieldKeys.map(key => {
    const value = elements[`mask-${key}`].value;
    return [key, /^-?\d+$/.test(value) ? Number(value) : NaN];
  }));
}
for (const key of fieldKeys) elements[`mask-${key}`].addEventListener('input', () => controller.invalidateOutput());
elements['mask-form'].addEventListener('submit', event => { event.preventDefault(); controller.addMask(readCoordinates()); });
elements['update-mask'].addEventListener('click', () => controller.updateMask(readCoordinates()));
elements.generate.addEventListener('click', () => { cancelDraft(); void controller.generate(); });
elements['cancel-generation'].addEventListener('click', () => controller.cancelGeneration());
elements.download.addEventListener('click', () => controller.download());

const canvas = elements['editor-canvas'];
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !event.isPrimary || !controller.getState().source) return;
  event.preventDefault(); controller.invalidateOutput();
  const bounds = canvas.getBoundingClientRect();
  draft = { pointerId: event.pointerId, jobId: controller.getState().jobId, start: { x: event.clientX, y: event.clientY }, rect: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height } };
  try { canvas.setPointerCapture(event.pointerId); } catch { cancelDraft(); }
});
canvas.addEventListener('pointermove', event => {
  if (draft?.pointerId === event.pointerId) controller.showDraft(draft.start, { x: event.clientX, y: event.clientY }, draft.rect);
});
canvas.addEventListener('pointerup', event => {
  if (draft?.pointerId !== event.pointerId) return;
  const completed = draft; cancelDraft();
  controller.addPointer(completed.start, { x: event.clientX, y: event.clientY }, completed.rect);
});
function cancelDraft() {
  const cancelled = draft; draft = null; controller.clearDraft();
  if (cancelled) { try { canvas.releasePointerCapture(cancelled.pointerId); } catch { /* Capture may already have been released. */ } }
}
canvas.addEventListener('pointercancel', cancelDraft);
canvas.addEventListener('lostpointercapture', cancelDraft);
globalThis.addEventListener('resize', cancelDraft);
globalThis.addEventListener('pagehide', () => { cancelDraft(); selectionSignature = ''; controller.pagehide(); });
globalThis.addEventListener('pageshow', event => { if (event.persisted) { cancelDraft(); selectionSignature = ''; controller.pageshow(true); } });
