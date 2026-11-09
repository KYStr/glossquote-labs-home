import { LIMITS, fail, assertCurrent, ImageInputError } from './errors.mjs';

const PNG = [137, 80, 78, 71, 13, 10, 26, 10];
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = (n & 1) ? (0xedb88320 ^ (n >>> 1)) : n >>> 1;
  return n >>> 0;
});

function crc(bytes, start, end) {
  let value = 0xffffffff;
  for (let i = start; i < end; i++) value = crcTable[(value ^ bytes[i]) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

export function validateDimensions(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) fail('IMAGE_HEADER_INVALID');
  if (width > LIMITS.edge || height > LIMITS.edge) fail('EDGE_LIMIT', { width, height });
  if (width * height > LIMITS.imagePixels) fail('PIXEL_LIMIT', { width, height });
}

// Only IFD0's orientation value is read; GPS, camera and thumbnail payloads are not followed.
function readOrientation(bytes) {
  const bad = () => fail('EXIF_INVALID');
  if (bytes.length < 8) bad();
  const little = bytes[0] === 73 && bytes[1] === 73;
  if (!little && !(bytes[0] === 77 && bytes[1] === 77)) bad();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset) => {
    if (offset < 0 || offset + 2 > bytes.length) bad();
    return view.getUint16(offset, little);
  };
  const u32 = (offset) => {
    if (offset < 0 || offset + 4 > bytes.length) bad();
    return view.getUint32(offset, little);
  };
  if (u16(2) !== 42) bad();
  const start = u32(4);
  if (start < 8 || start + 2 > bytes.length) bad();
  const count = u16(start);
  const end = start + 2 + count * 12;
  if (end + 4 > bytes.length) bad();
  const next = u32(end);
  if (next && (next < 8 || next + 2 > bytes.length)) bad();
  let orientation = null;
  for (let i = 0; i < count; i++) {
    const entry = start + 2 + i * 12;
    if (u16(entry) !== 0x0112) continue;
    if (u16(entry + 2) !== 3 || u32(entry + 4) !== 1) bad();
    const value = u16(entry + 8);
    if (value < 1 || value > 8 || (orientation !== null && orientation !== value)) bad();
    orientation = value;
  }
  return orientation;
}

function mergeOrientation(previous, next) {
  if (previous !== null && next !== null && previous !== next) fail('EXIF_INVALID');
  return next ?? previous;
}

function inspectPng(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8, width, height, orientation = null;
  let first = true, idat = false, idatEnded = false, idatBytes = 0, palette = false, exif = false;
  let color;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) fail('IMAGE_HEADER_INVALID');
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) fail('IMAGE_HEADER_INVALID');
    const nameBytes = bytes.subarray(offset + 4, offset + 8);
    if (!nameBytes.every((c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122)) || nameBytes[2] > 90) fail('IMAGE_HEADER_INVALID');
    const type = String.fromCharCode(...nameBytes);
    if (first && (type !== 'IHDR' || length !== 13)) fail('IMAGE_HEADER_INVALID');
    if (crc(bytes, offset + 4, offset + 8 + length) !== view.getUint32(offset + 8 + length)) fail('IMAGE_HEADER_INVALID');
    if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') fail('ANIMATED_PNG');
    if (type === 'IHDR') {
      if (!first) fail('IMAGE_HEADER_INVALID');
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      const depth = bytes[offset + 16];
      color = bytes[offset + 17];
      const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
      if (!depths[color]?.includes(depth) || bytes[offset + 18] !== 0 || bytes[offset + 19] !== 0 || bytes[offset + 20] > 1) fail('IMAGE_HEADER_INVALID');
    } else if (type === 'IDAT') {
      if (idatEnded || (color === 3 && !palette)) fail('IMAGE_HEADER_INVALID');
      idat = true;
      idatBytes += length;
    } else {
      if (idat) idatEnded = true;
      if (type === 'PLTE') {
        if (palette || idat || length < 3 || length > 768 || length % 3 || color === 0 || color === 4) fail('IMAGE_HEADER_INVALID');
        palette = true;
      } else if (type === 'eXIf') {
        if (exif) fail('EXIF_INVALID');
        exif = true;
        orientation = readOrientation(bytes.subarray(offset + 8, offset + 8 + length));
      } else if (type === 'IEND') {
        if (length || !idat || !idatBytes || end !== bytes.length) fail('IMAGE_HEADER_INVALID');
        return { format: 'png', rawWidth: width, rawHeight: height, orientation: orientation ?? 1 };
      } else if (nameBytes[0] <= 90) fail('IMAGE_HEADER_INVALID');
    }
    first = false;
    offset = end;
  }
  fail('IMAGE_HEADER_INVALID');
}

function inspectJpeg(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2, width, height, orientation = null, components;
  let sawScan = false, entropy = false, entropyBytes = 0;
  while (offset < bytes.length) {
    if (entropy) {
      while (offset < bytes.length && bytes[offset] !== 0xff) { offset++; entropyBytes++; }
      if (offset >= bytes.length) fail('IMAGE_HEADER_INVALID');
    }
    if (bytes[offset++] !== 0xff) fail('IMAGE_HEADER_INVALID');
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) fail('IMAGE_HEADER_INVALID');
    const marker = bytes[offset++];
    if (entropy && (marker === 0 || (marker >= 0xd0 && marker <= 0xd7))) { entropyBytes++; continue; }
    entropy = false;
    if (marker === 0xd9) {
      if (!width || !sawScan || !entropyBytes || offset !== bytes.length) fail('IMAGE_HEADER_INVALID');
      return { format: 'jpeg', rawWidth: width, rawHeight: height, orientation: orientation ?? 1 };
    }
    if (marker === 0xd8 || marker === 0 || (marker >= 0xd0 && marker <= 0xd7)) fail('IMAGE_HEADER_INVALID');
    if (marker === 1) continue;
    if (offset + 2 > bytes.length) fail('IMAGE_HEADER_INVALID');
    const length = view.getUint16(offset);
    const end = offset + length;
    if (length < 2 || end > bytes.length) fail('IMAGE_HEADER_INVALID');
    const start = offset + 2;
    if (SOF.has(marker)) {
      if (width !== undefined || length < 11) fail('IMAGE_HEADER_INVALID');
      const precision = bytes[start];
      height = view.getUint16(start + 1);
      width = view.getUint16(start + 3);
      components = bytes[start + 5];
      if (![8, 12, 16].includes(precision) || components < 1 || components > 4 || length !== 8 + components * 3) fail('IMAGE_HEADER_INVALID');
    }
    if (marker === 0xe1 && end - start >= 4 && [69, 120, 105, 102].every((c, i) => bytes[start + i] === c)) {
      if (end - start < 6 || bytes[start + 4] !== 0 || bytes[start + 5] !== 0) fail('EXIF_INVALID');
      orientation = mergeOrientation(orientation, readOrientation(bytes.subarray(start + 6, end)));
    }
    if (marker === 0xda) {
      if (!width || length < 8) fail('IMAGE_HEADER_INVALID');
      const scanComponents = bytes[start];
      if (scanComponents < 1 || scanComponents > components || length !== 6 + scanComponents * 2) fail('IMAGE_HEADER_INVALID');
      sawScan = true;
      entropy = true;
    }
    offset = end;
  }
  fail('IMAGE_HEADER_INVALID');
}

export function inspectImageHeader(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length > LIMITS.fileBytes) fail('FILE_TOO_LARGE');
  let metadata;
  if (PNG.every((value, i) => bytes[i] === value)) metadata = inspectPng(bytes);
  else if (bytes[0] === 255 && bytes[1] === 216) metadata = inspectJpeg(bytes);
  else fail('UNSUPPORTED_FORMAT');
  validateDimensions(metadata.rawWidth, metadata.rawHeight);
  const swap = metadata.orientation >= 5;
  return Object.freeze({ ...metadata, animated: false,
    visualWidth: swap ? metadata.rawHeight : metadata.rawWidth,
    visualHeight: swap ? metadata.rawWidth : metadata.rawHeight,
  });
}

export function validateFileSizes(files) {
  if (!Array.isArray(files) || files.length < 1) fail('IMAGE_HEADER_INVALID');
  if (files.length > LIMITS.count) fail('TOO_MANY_FILES', { count: files.length });
  let total = 0;
  for (const [index, file] of files.entries()) {
    if (!file || typeof file.name !== 'string' || !Number.isSafeInteger(file.size) || file.size < 1) fail('IMAGE_HEADER_INVALID', { index });
    if (file.size > LIMITS.fileBytes) fail('FILE_TOO_LARGE', { index, bytes: file.size });
    total += file.size;
    if (total > LIMITS.totalBytes) fail('TOTAL_TOO_LARGE', { bytes: total });
  }
  return { count: files.length, bytes: total };
}

export function validateItems(items) {
  validateFileSizes(items.map((item) => item.file));
  for (const item of items) {
    const m = item.metadata;
    if (!m || !['jpeg', 'png'].includes(m.format) || m.animated !== false || !Number.isInteger(m.orientation) || m.orientation < 1 || m.orientation > 8) fail('IMAGE_HEADER_INVALID');
    validateDimensions(m.rawWidth, m.rawHeight);
    const swap = m.orientation >= 5;
    if (m.visualWidth !== (swap ? m.rawHeight : m.rawWidth) || m.visualHeight !== (swap ? m.rawWidth : m.rawHeight)) fail('EXIF_INVALID');
  }
}

export async function preflightSelection(files, control = {}) {
  validateFileSizes(files);
  const items = [];
  for (const [index, file] of files.entries()) {
    assertCurrent(control);
    control.onProgress?.({ phase: 'preflighting', index: index + 1, total: files.length });
    let buffer = null;
    try {
      buffer = await file.arrayBuffer();
      assertCurrent(control);
      if (buffer.byteLength !== file.size) fail('IMAGE_HEADER_INVALID');
      const metadata = inspectImageHeader(new Uint8Array(buffer));
      items.push(Object.freeze({ file, metadata }));
    } catch (error) {
      if (error instanceof ImageInputError) throw new ImageInputError(error.code, { ...error.details, index });
      fail('IMAGE_HEADER_INVALID', { index });
    } finally { buffer = null; }
  }
  assertCurrent(control);
  return items;
}
