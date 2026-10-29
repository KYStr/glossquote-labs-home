import { LIMITS, fail } from './errors.mjs';

export function fitContain(sourceW, sourceH, boxW = 240, boxH = 180) {
  if (![sourceW, sourceH, boxW, boxH].every((v) => Number.isFinite(v) && v > 0)) fail('IMAGE_HEADER_INVALID');
  const scale = Math.min(boxW / sourceW, boxH / sourceH);
  const width = sourceW * scale;
  const height = sourceH * scale;
  return { scale, width, height, dx: (boxW - width) / 2, dy: (boxH - height) / 2 };
}

export function normalizeColumns(count, choice) {
  if (!Number.isInteger(count) || count < 1 || count > LIMITS.count) fail('SHEET_PIXEL_LIMIT');
  if (choice === undefined) return Math.min(4, count);
  if (!Number.isInteger(choice) || choice < 1 || choice > 6) fail('SHEET_PIXEL_LIMIT');
  return Math.min(choice, count);
}

export function validateSheetSize(width, height) {
  if (![width, height].every((v) => Number.isSafeInteger(v) && v > 0) || width > LIMITS.edge || height > LIMITS.edge || width * height > LIMITS.sheetPixels) fail('SHEET_PIXEL_LIMIT', { width, height });
}

export function sheetLayout(count, choice) {
  const columns = normalizeColumns(count, choice);
  const rows = Math.ceil(count / columns);
  const width = 48 + columns * 240 + (columns - 1) * 16;
  const height = 32 + rows * 240;
  validateSheetSize(width, height);
  return { columns, rows, width, height, pixels: width * height };
}

export function cellOrigin(index, columns) {
  return { x: 24 + (index % columns) * 256, y: 24 + Math.floor(index / columns) * 240 };
}

export function shortenLabel(name) {
  const points = Array.from(name);
  return points.length > 32 ? points.slice(0, 31).join('') + '…' : name;
}

// Canvas measures glyphs; bounding-box clipping provides a second guard for unusual glyph widths.
export function labelLines(name, measure, maxWidth = 204) {
  const points = Array.from(shortenLabel(name).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/gu, ' '));
  const lines = [''];
  for (const point of points) {
    let line = lines.length - 1;
    if (measure(lines[line] + point) > maxWidth && lines[line] && line === 0) {
      lines.push(''); line = 1;
    }
    lines[line] += point;
  }
  return lines;
}
