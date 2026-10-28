// Adapted from the repository's 39-image-redactor header parser (read-only
// reference, 2026-10-23). This copy is independent: stricter limits, PNG EXIF,
// bounded TIFF traversal and full JPEG segment/entropy framing through EOI.
import { MAX_FILE_BYTES, MAX_EDGE, MAX_PIXELS, fail } from './geometry.mjs';

const failure = code => ({ ok: false, error: { code } });
export function validateFileSize(size) {
  if (!Number.isSafeInteger(size) || size < 0) return failure('HEADER_UNSAFE');
  if (size === 0) return failure('FILE_EMPTY');
  if (size > MAX_FILE_BYTES) return failure('FILE_TOO_LARGE');
  return { ok: true };
}
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes, start, end) {
  let value = 0xffffffff;
  for (let index = start; index < end; index++) value = crcTable[(value ^ bytes[index]) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function dimensions(format, width, height, orientation = 1) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) return failure('DIMENSION_INVALID');
  if (width > MAX_EDGE || height > MAX_EDGE) return failure('DIMENSION_LIMIT');
  const pixelCount = width * height;
  if (!Number.isSafeInteger(pixelCount) || pixelCount > MAX_PIXELS) return failure('PIXEL_LIMIT');
  return { ok: true, format, width, height, orientation,
    visualWidth: orientation >= 5 ? height : width,
    visualHeight: orientation >= 5 ? width : height, pixelCount };
}

const pngDepths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
const beforePalette = new Set(['cHRM', 'cICP', 'gAMA', 'iCCP', 'mDCV', 'cLLI', 'sBIT', 'sRGB']);
const beforeData = new Set(['bKGD', 'hIST', 'tRNS', 'eXIf', 'pHYs', 'sPLT']);
const singleton = new Set([...beforePalette, ...beforeData, 'tIME', 'PLTE']);
singleton.delete('sPLT');

function inspectPng(bytes, view) {
  let offset = 8;
  let width, height, depth, color;
  let sawData = false, dataEnded = false, paletteEntries = 0, paletteFollower = false, orientation = 1;
  const seen = new Set();
  while (offset < bytes.length) {
    if (bytes.length - offset < 12) return failure('HEADER_TRUNCATED');
    const length = view.getUint32(offset);
    if (length > bytes.length - offset - 12) return failure('HEADER_TRUNCATED');
    if (length > 0x7fffffff) return failure('HEADER_UNSAFE');
    const start = offset + 8, end = start + length;
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type)) return failure('HEADER_INVALID');
    if (crc32(bytes, offset + 4, end) !== view.getUint32(end)) return failure('HEADER_INVALID');
    if (['acTL', 'fcTL', 'fdAT'].includes(type)) return failure('ANIMATED_PNG');
    if (offset === 8 && type !== 'IHDR') return failure('HEADER_INVALID');
    if (type === 'IHDR') {
      if (offset !== 8 || length !== 13 || seen.has(type)) return failure('HEADER_INVALID');
      width = view.getUint32(start); height = view.getUint32(start + 4);
      depth = bytes[start + 8]; color = bytes[start + 9];
      if (width === 0 || height === 0 || width > 0x7fffffff || height > 0x7fffffff ||
          !pngDepths[color]?.includes(depth) || bytes[start + 10] !== 0 || bytes[start + 11] !== 0 || bytes[start + 12] > 1) return failure('HEADER_INVALID');
    } else if (type === 'PLTE') {
      if (sawData || paletteFollower || seen.has(type) || [0, 4].includes(color) || length < 3 || length % 3 !== 0 || length > 768) return failure('HEADER_INVALID');
      paletteEntries = length / 3;
      if (color === 3 && paletteEntries > 2 ** depth) return failure('HEADER_INVALID');
    } else if (type === 'IDAT') {
      if (dataEnded || (color === 3 && !paletteEntries)) return failure('HEADER_INVALID');
      sawData = true;
    } else if (type === 'IEND') {
      if (!sawData || length !== 0 || end + 4 !== bytes.length) return failure('HEADER_INVALID');
      return dimensions('png', width, height, orientation);
    } else {
      if (type[0] === type[0].toUpperCase()) return failure('HEADER_UNSAFE');
      if (singleton.has(type) && seen.has(type)) return failure('HEADER_INVALID');
      if (beforePalette.has(type) && (paletteEntries || sawData)) return failure('HEADER_INVALID');
      if (beforeData.has(type) && sawData) return failure('HEADER_INVALID');
      if (type === 'eXIf') {
        const exif = inspectExif(bytes, start, end);
        if (!exif.ok) return exif;
        orientation = exif.orientation;
      }
      if (['bKGD', 'tRNS', 'hIST'].includes(type)) paletteFollower = true;
      if (type === 'tRNS') {
        if ((color === 0 && length !== 2) || (color === 2 && length !== 6) ||
            (color === 3 && (!paletteEntries || length === 0 || length > paletteEntries)) || [4, 6].includes(color)) return failure('HEADER_INVALID');
      }
      if (type === 'hIST' && (!paletteEntries || length !== paletteEntries * 2)) return failure('HEADER_INVALID');
      if (type === 'bKGD' && (length !== ([0, 4].includes(color) ? 2 : color === 3 ? 1 : 6) ||
          (color === 3 && (!paletteEntries || bytes[start] >= paletteEntries)))) return failure('HEADER_INVALID');
      const fixedLengths = { cHRM: 32, cICP: 4, gAMA: 4, mDCV: 24, cLLI: 8, sRGB: 1, pHYs: 9, tIME: 7 };
      if (Object.hasOwn(fixedLengths, type) && length !== fixedLengths[type]) return failure('HEADER_INVALID');
      if (type === 'gAMA' && view.getUint32(start) === 0) return failure('HEADER_INVALID');
      if (type === 'sRGB' && bytes[start] > 3) return failure('HEADER_INVALID');
      if (type === 'pHYs' && bytes[start + 8] > 1) return failure('HEADER_INVALID');
      if (type === 'sBIT') {
        const count = { 0: 1, 2: 3, 3: 3, 4: 2, 6: 4 }[color];
        if (length !== count || bytes.subarray(start, end).some(value => value === 0 || value > (color === 3 ? 8 : depth))) return failure('HEADER_INVALID');
      }
    }
    if (sawData && type !== 'IDAT') dataEnded = true;
    seen.add(type);
    offset = end + 4;
  }
  return failure('HEADER_INVALID');
}

function inspectExif(bytes, start, end) {
  // start points at TIFF, after the six Exif signature bytes. No pointer may leave APP1.
  if (end - start < 8) return failure('EXIF_INVALID');
  const little = bytes[start] === 0x49 && bytes[start + 1] === 0x49;
  const big = bytes[start] === 0x4d && bytes[start + 1] === 0x4d;
  if (!little && !big) return failure('EXIF_INVALID');
  const view = new DataView(bytes.buffer, bytes.byteOffset + start, end - start);
  if (view.getUint16(2, little) !== 42) return failure('EXIF_INVALID');
  const ifd = view.getUint32(4, little);
  if (ifd < 8 || ifd > view.byteLength - 2) return failure('EXIF_INVALID');
  // Validate every referenced IFD/data range before trusting orientation. Maker
  // notes are opaque values, not code. Bounded visited offsets reject cycles.
  const typeSizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8, 4];
  const pending = [ifd], visited = new Set();
  let totalEntries = 0;
  while (pending.length) {
    const at = pending.pop();
    if (visited.has(at) || visited.size >= 256 || at < 8 || at > view.byteLength - 2) return failure('EXIF_INVALID');
    visited.add(at);
    const entries = view.getUint16(at, little), boundary = at + 2 + entries * 12;
    totalEntries += entries;
    if (totalEntries > 4096 || boundary > view.byteLength - 4) return failure('EXIF_INVALID');
    for (let entry = at + 2; entry < boundary; entry += 12) {
      const tag = view.getUint16(entry, little), type = view.getUint16(entry + 2, little), size = view.getUint32(entry + 4, little);
      if (!typeSizes[type] || size === 0) return failure('EXIF_INVALID');
      const length = typeSizes[type] * size, offset = view.getUint32(entry + 8, little);
      if (length > 4 && (offset < 8 || offset > view.byteLength - length)) return failure('EXIF_INVALID');
      if ([0x8769, 0x8825, 0xa005, 0x014a].includes(tag)) {
        if (type !== 4 && type !== 13) return failure('EXIF_INVALID');
        if (size > 256) return failure('EXIF_INVALID');
        for (let index = 0; index < size; index++) pending.push(size === 1 ? offset : view.getUint32(offset + index * 4, little));
      }
    }
    const nextOffset = view.getUint32(boundary, little);
    if (nextOffset !== 0) pending.push(nextOffset);
  }
  const count = view.getUint16(ifd, little);
  const entriesEnd = ifd + 2 + count * 12;
  if (entriesEnd > view.byteLength - 4) return failure('EXIF_INVALID');
  const next = view.getUint32(entriesEnd, little);
  if (next !== 0 && (next < 8 || next > view.byteLength - 2)) return failure('EXIF_INVALID');
  let orientation = 1, found = false;
  for (let entry = ifd + 2; entry < entriesEnd; entry += 12) {
    if (view.getUint16(entry, little) !== 0x0112) continue;
    if (found || view.getUint16(entry + 2, little) !== 3 || view.getUint32(entry + 4, little) !== 1) return failure('EXIF_INVALID');
    orientation = view.getUint16(entry + 8, little);
    if (orientation < 1 || orientation > 8) return failure('EXIF_INVALID');
    found = true;
  }
  return { ok: true, orientation };
}
function inspectJpeg(bytes, view) {
  let offset = 2, frame = null, orientation = 1, scans = 0;
  const exifSegments = [];
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return failure('HEADER_INVALID');
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset === bytes.length) return failure('HEADER_TRUNCATED');
    const marker = bytes[offset++];
    if (marker === 0xd9) {
      if (!frame || scans === 0 || offset !== bytes.length) return failure('HEADER_INVALID');
      if (exifSegments.length > 1) return failure('EXIF_INVALID');
      if (exifSegments.length === 1) {
        const { start: a, end: b } = exifSegments[0];
        const signature = [69, 120, 105, 102, 0, 0];
        if (b - a < 6 || !signature.every((value, index) => bytes[a + index] === value)) return failure('EXIF_INVALID');
        const parsed = inspectExif(bytes, a + 6, b);
        if (!parsed.ok) return parsed;
        orientation = parsed.orientation;
      }
      return dimensions('jpeg', frame.width, frame.height, orientation);
    }
    if (marker === 0 || marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) return failure('HEADER_INVALID');
    if (bytes.length - offset < 2) return failure('HEADER_TRUNCATED');
    const length = view.getUint16(offset);
    if (length < 2) return failure('HEADER_INVALID');
    if (length > bytes.length - offset) return failure('HEADER_TRUNCATED');
    const start = offset + 2, end = offset + length;
    const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isFrame) {
      if (![0xc0, 0xc2].includes(marker)) return failure('JPEG_MODE_UNSUPPORTED');
      if (frame || length < 8) return failure('HEADER_INVALID');
      const precision = bytes[start], height = view.getUint16(start + 1), width = view.getUint16(start + 3), components = bytes[start + 5];
      if (precision !== 8 || ![1, 3].includes(components)) return failure('JPEG_MODE_UNSUPPORTED');
      if (length !== 8 + components * 3) return failure('HEADER_INVALID');
      if (height === 0 || width === 0) return failure('DIMENSION_INVALID');
      const ids = [], sampling = [];
      for (let index = 0; index < components; index++) {
        const at = start + 6 + index * 3;
        const id = bytes[at], h = bytes[at + 1] >>> 4, v = bytes[at + 1] & 15;
        if (ids.includes(id) || h < 1 || h > 4 || v < 1 || v > 4 || bytes[at + 2] > 3) return failure('HEADER_INVALID');
        ids.push(id); sampling.push(h * v);
      }
      frame = { width, height, ids, sampling, marker };
    } else if (marker === 0xe1) {
      const signature = [69, 120, 105, 102, 0, 0];
      // An APP1 claiming Exif but truncating its signature is unsafe, not an unrelated APP1.
      const claimsExif = end - start >= 4 && signature.slice(0, 4).every((value, index) => bytes[start + index] === value);
      if (claimsExif) exifSegments.push({ start, end });
    } else if (marker === 0xda) {
      if (!frame || length < 6) return failure('HEADER_INVALID');
      const count = bytes[start];
      if (count < 1 || count > frame.ids.length || length !== 6 + count * 2) return failure('HEADER_INVALID');
      const scanIds = [], indexes = [];
      for (let index = 0; index < count; index++) {
        const id = bytes[start + 1 + index * 2], tables = bytes[start + 2 + index * 2];
        if (!frame.ids.includes(id) || scanIds.includes(id) || (tables >>> 4) > (frame.marker === 0xc0 ? 1 : 3) || (tables & 15) > (frame.marker === 0xc0 ? 1 : 3)) return failure('HEADER_INVALID');
        scanIds.push(id); indexes.push(frame.ids.indexOf(id));
      }
      if (count > 1 && indexes.reduce((sum, index) => sum + frame.sampling[index], 0) > 10) return failure('HEADER_INVALID');
      const ss = bytes[end - 3], se = bytes[end - 2], ah = bytes[end - 1] >>> 4, al = bytes[end - 1] & 15;
      if (frame.marker === 0xc0 ? (ss !== 0 || se !== 63 || ah !== 0 || al !== 0) :
          (ss > se || se > 63 || (ss === 0 && se !== 0) || (ss > 0 && count !== 1) || ah > 13 || al > 13 || (ah !== 0 && ah !== al + 1))) return failure('HEADER_INVALID');
      scans++;
      offset = end;
      const scanStart = offset;
      while (offset < bytes.length) {
        if (bytes[offset] !== 0xff) { offset++; continue; }
        if (offset + 1 === bytes.length) return failure('HEADER_TRUNCATED');
        if (bytes[offset + 1] === 0 || (bytes[offset + 1] >= 0xd0 && bytes[offset + 1] <= 0xd7)) { offset += 2; continue; }
        break;
      }
      if (offset === scanStart) return failure('HEADER_INVALID');
      continue;
    } else if (marker === 0xdd) {
      if (length !== 4) return failure('HEADER_INVALID');
    } else if (marker === 0xdb) {
      let cursor = start;
      if (cursor === end) return failure('HEADER_INVALID');
      while (cursor < end) {
        const info = bytes[cursor++], precision = info >>> 4;
        if (precision > 1 || (info & 15) > 3) return failure('HEADER_INVALID');
        cursor += 64 * (precision + 1);
        if (cursor > end) return failure('HEADER_INVALID');
      }
    } else if (marker === 0xc4) {
      let cursor = start;
      if (cursor === end) return failure('HEADER_INVALID');
      while (cursor < end) {
        if (end - cursor < 17) return failure('HEADER_INVALID');
        const info = bytes[cursor++];
        if ((info >>> 4) > 1 || (info & 15) > 3) return failure('HEADER_INVALID');
        let symbols = 0, slots = 1;
        for (let index = 0; index < 16; index++) { slots = slots * 2 - bytes[cursor]; symbols += bytes[cursor++]; if (slots < 0) return failure('HEADER_INVALID'); }
        if (symbols === 0 || symbols > 256 || cursor + symbols > end) return failure('HEADER_INVALID');
        cursor += symbols;
      }
    } else if (!((marker >= 0xe0 && marker <= 0xef) || [0xfe, 0xc4, 0xdb, 0xdd].includes(marker))) {
      return failure('JPEG_MODE_UNSUPPORTED');
    }
    offset = end;
  }
  return failure('HEADER_TRUNCATED');
}

function inspectRasterHeader(bytes) {
  try {
    if (!(bytes instanceof Uint8Array)) return failure('HEADER_UNSAFE');
    const size = validateFileSize(bytes.byteLength);
    if (!size.ok) return size;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 8 && pngSignature.slice(0, bytes.length).every((value, index) => bytes[index] === value)) return failure('HEADER_TRUNCATED');
    if (pngSignature.every((value, index) => bytes[index] === value)) return inspectPng(bytes, view);
    if (bytes[0] === 0xff && bytes.length === 1) return failure('HEADER_TRUNCATED');
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return inspectJpeg(bytes, view);
    return failure('UNSUPPORTED_FORMAT');
  } catch { return failure('HEADER_UNSAFE'); }
}

export function inspectImage(bytes) {
  const parsed = inspectRasterHeader(bytes);
  if (!parsed.ok) fail(parsed.error.code);
  return { kind: parsed.format, width: parsed.width, height: parsed.height, orientation: parsed.orientation };
}
