// DOM 層：只做接線與渲染。所有決策在 core；使用者 SVG 只能經 blob: 圖片載入，永不進頁面 DOM。
import { processInput } from './core/process.mjs';
import { computeOutputSize, checkOutputCaps, validateDimensionInput, isValidHexColor, outputFileName } from './core/size.mjs';
import { t, removalSummary } from './core/strings.mjs';

const lang = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'zh';

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">'
  + '<circle cx="120" cy="120" r="110" fill="#3366cc"/>'
  + '<circle cx="120" cy="120" r="86" fill="#ffffff"/>'
  + '<path d="M120 62 L152 158 L88 158 Z" fill="#f2a541"/>'
  + '<rect x="104" y="168" width="32" height="10" rx="5" fill="#3366cc"/></svg>';

const el = (id) => document.getElementById(id);
const pasteInput = el('paste-input');
const fileInput = el('file-input');
const dropZone = el('drop-zone');
const statusEl = el('status');
const errorEl = el('error');
const intrinsicText = el('intrinsic-text');
const sanitizedSizeText = el('sanitized-size-text');
const removedText = el('removed-text');
const widthInput = el('width-input');
const heightInput = el('height-input');
const scaleInput = el('scale-input');
const colorInput = el('color-input');
const previewWrap = el('preview-wrap');
const previewImg = el('preview-img');
const outputText = el('output-text');
const downloadButton = el('download-button');
const filenameText = el('filename-text');

let current = null; // {serialized, counts, intrinsic, blobUrl}
let generation = 0;

function setError(message) {
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  } else {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
}

function setStatus(message) { statusEl.textContent = message; }

function formatSize(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function selectedMode() {
  return document.querySelector('input[name="size-mode"]:checked').value;
}

function selectedBackground() {
  return document.querySelector('input[name="background"]:checked').value;
}

// 讀控制值並驗證；回傳 {mode, value, background: {kind, color}} 或 {error}。
function readControls() {
  const mode = selectedMode();
  const input = mode === 'width' ? widthInput : mode === 'height' ? heightInput : scaleInput;
  const validated = validateDimensionInput(input.value, mode);
  if (!validated.ok) {
    return { error: t(lang, validated.code === 'invalid-scale' ? 'errInvalidScale' : 'errInvalidDimension') };
  }
  const bgKind = selectedBackground();
  let background = { kind: bgKind, color: null };
  if (bgKind === 'white') background = { kind: bgKind, color: '#ffffff' };
  if (bgKind === 'custom') {
    if (!isValidHexColor(colorInput.value)) return { error: t(lang, 'errInvalidColor') };
    background = { kind: bgKind, color: colorInput.value.trim() };
  }
  return { mode, value: validated.value, background };
}

function clearPreview() {
  previewImg.hidden = true;
  previewImg.removeAttribute('src');
  outputText.textContent = '';
  filenameText.textContent = '';
  downloadButton.disabled = true;
}

// 依目前文件與控制值重算輸出並重繪預覽；錯誤時無預覽、無下載（SPEC 第 3 節）。
function recompute() {
  if (!current) {
    clearPreview();
    return;
  }
  const controls = readControls();
  if (controls.error) {
    setError(controls.error);
    clearPreview();
    return;
  }
  const size = computeOutputSize(current.intrinsic, controls.mode, controls.value);
  const capError = checkOutputCaps(size);
  if (capError) {
    setError(t(lang, 'errOutputCap', capError));
    clearPreview();
    return;
  }
  setError('');
  current.outputSize = size;
  current.background = controls.background;
  if (current.blobUrl) URL.revokeObjectURL(current.blobUrl);
  current.blobUrl = URL.createObjectURL(new Blob([current.serialized], { type: 'image/svg+xml' }));
  previewImg.src = current.blobUrl;
  previewImg.width = size.width;
  previewImg.height = size.height;
  previewImg.alt = t(lang, 'previewAlt');
  previewImg.hidden = false;
  previewWrap.dataset.bg = controls.background.kind;
  previewWrap.style.background = controls.background.kind === 'custom' ? controls.background.color : '';
  outputText.textContent = t(lang, 'outputLabel', size);
  filenameText.textContent = outputFileName(size.width, size.height);
  downloadButton.disabled = false;
  setStatus(t(lang, 'ready'));
}

function showFacts(result) {
  intrinsicText.textContent = t(lang, 'intrinsicLabel', {
    width: formatSize(result.intrinsic.width),
    height: formatSize(result.intrinsic.height),
  }) + ' — ' + t(lang, `rule${result.intrinsic.rule}`);
  sanitizedSizeText.textContent = t(lang, 'sanitizedSize', { bytes: result.serializedBytes });
  removedText.textContent = result.counts.total > 0 ? removalSummary(lang, result.counts) : '';
}

function errorMessageFor(error) {
  switch (error.code) {
    case 'input-over-cap':
      return t(lang, error.capUnit === 'bytes' ? 'errInputCapBytes' : 'errInputCapChars', error);
    case 'not-well-formed':
      return t(lang, 'errParse', error);
    case 'root':
      return error.found === 'svg' && !error.foundNamespace
        ? t(lang, 'errRootSvgNoNs')
        : t(lang, 'errRootOther', error);
    case 'undeterminable':
      return t(lang, 'errUndeterminable');
    default:
      return error.code;
  }
}

// 新輸入完整取代舊文件；淨化只在這裡跑一次，之後尺寸變更重用結果。
function acceptInput(text, size, capUnit) {
  generation += 1;
  const result = processInput(text, { size, capUnit });
  if (current?.blobUrl) URL.revokeObjectURL(current.blobUrl);
  current = null;
  if (result.status === 'error') {
    setError(errorMessageFor(result.error));
    setStatus('');
    intrinsicText.textContent = '';
    sanitizedSizeText.textContent = '';
    removedText.textContent = '';
    clearPreview();
    return;
  }
  current = {
    serialized: result.serialized,
    counts: result.counts,
    intrinsic: result.intrinsic,
    blobUrl: null,
    outputSize: null,
    background: null,
  };
  setError('');
  showFacts(result);
  recompute();
}

function loadSample() {
  pasteInput.value = SAMPLE_SVG;
  acceptInput(SAMPLE_SVG, SAMPLE_SVG.length, 'chars');
}

pasteInput.addEventListener('input', () => {
  const text = pasteInput.value;
  if (text.trim() === '') {
    generation += 1;
    if (current?.blobUrl) URL.revokeObjectURL(current.blobUrl);
    current = null;
    setError('');
    setStatus(t(lang, 'empty'));
    intrinsicText.textContent = '';
    sanitizedSizeText.textContent = '';
    removedText.textContent = '';
    clearPreview();
    return;
  }
  acceptInput(text, text.length, 'chars');
});

async function acceptFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    acceptInput(text, file.size, 'bytes');
  } catch {
    setError(t(lang, 'errFileRead'));
  }
}

fileInput.addEventListener('change', () => {
  acceptFile(fileInput.files?.[0]);
  fileInput.value = '';
});
dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('dragging');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('dragging');
  acceptFile(event.dataTransfer?.files?.[0]);
});

el('sample-button').addEventListener('click', loadSample);
el('clear-button').addEventListener('click', () => {
  pasteInput.value = '';
  pasteInput.dispatchEvent(new Event('input'));
  pasteInput.focus();
});

for (const control of document.querySelectorAll(
  'input[name="size-mode"], input[name="background"], #width-input, #height-input, #scale-input, #color-input',
)) {
  control.addEventListener('input', recompute);
  control.addEventListener('change', recompute);
}

// 下載：canvas 依 SPEC 第 4 節 — 先填背景（若有），再以輸出尺寸畫淨化後 SVG。
downloadButton.addEventListener('click', async () => {
  if (!current?.outputSize) return;
  const ticket = ++generation;
  const { width, height } = current.outputSize;
  const img = new Image();
  const url = URL.createObjectURL(new Blob([current.serialized], { type: 'image/svg+xml' }));
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    if (ticket !== generation) return;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (current.background?.color) {
      context.fillStyle = current.background.color;
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(img, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (ticket !== generation) return;
    if (!blob) {
      setError(t(lang, 'errExport'));
      return;
    }
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = outputFileName(width, height);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
  } catch {
    if (ticket === generation) setError(t(lang, 'errExport'));
  } finally {
    URL.revokeObjectURL(url);
  }
});

loadSample();
