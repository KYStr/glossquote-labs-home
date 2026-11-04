import { MAX_PIXELS, fail, validateSettings } from './geometry.mjs';

function validate(data) {
  if (!(data instanceof Uint8ClampedArray) || data.length < 4 || data.length % 4 !== 0 || data.length / 4 > MAX_PIXELS) fail('PIXELS_INVALID');
}
function pair(a, b) { validate(a); validate(b); if (a.length !== b.length) fail('DIMENSION_MISMATCH'); }
function thresholdValue(threshold) { if (!Number.isInteger(threshold) || threshold < 0 || threshold > 255) fail('SETTINGS_INVALID'); }
export function flattenWhite(data) {
  validate(data);
  const output = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    for (let channel = 0; channel < 3; channel++) output[i + channel] = Math.round(data[i + channel] * alpha + 255 * (1 - alpha));
    output[i + 3] = 255;
  }
  return output;
}
function differs(a, b, i, threshold) {
  return Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > threshold;
}
export function comparePixels(a, b, options = { threshold: 0 }) {
  pair(a, b);
  if (!options || Object.keys(options).join(',') !== 'threshold') fail('SETTINGS_INVALID');
  thresholdValue(options.threshold);
  let changed = 0;
  for (let i = 0; i < a.length; i += 4) if (differs(a, b, i, options.threshold)) changed++;
  const total = a.length / 4;
  return { changed, total, percent: changed / total * 100 };
}
function paint(a, b, output, i, settings, different) {
  if (settings.mode === 'blend') {
    for (let c = 0; c < 3; c++) output[i + c] = Math.round(a[i + c] * (100 - settings.opacity) / 100 + b[i + c] * settings.opacity / 100);
  } else if (different) { output[i] = 213; output[i + 1] = 38; output[i + 2] = 42; }
  else {
    const gray = Math.round((a[i] + a[i + 1] + a[i + 2]) / 3 * 0.25 + 255 * 0.75);
    output[i] = gray; output[i + 1] = gray; output[i + 2] = gray;
  }
  output[i + 3] = 255;
}
export function blendPixels(a, b, opacity) {
  pair(a, b);
  const settings = validateSettings({ mode: 'blend', threshold: 0, opacity });
  const output = new Uint8ClampedArray(a.length);
  for (let i = 0; i < a.length; i += 4) paint(a, b, output, i, settings, false);
  return output;
}

// Pure iterator: each next() performs at most 100,000 pixels. The controller owns
// yielding/cancellation and the only result canvas. No callbacks or side effects.
export function* comparisonChunks(a, b, settings) {
  pair(a, b); settings = validateSettings(settings);
  const total = a.length / 4, output = new Uint8ClampedArray(a.length);
  let changed = 0;
  for (let start = 0; start < total; start += 100_000) {
    const end = Math.min(total, start + 100_000);
    for (let pixel = start; pixel < end; pixel++) {
      const i = pixel * 4, different = differs(a, b, i, settings.threshold);
      if (different) changed++;
      paint(a, b, output, i, settings, different);
    }
    yield { done: end, total };
  }
  return { pixels: output, stats: { changed, total, percent: changed / total * 100 } };
}
