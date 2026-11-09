// Minimal deterministic PNG encoder (RGBA, 8-bit) with a pure-JS
// fixed-Huffman DEFLATE compressor. No timestamps or ancillary chunks:
// the same pixels always produce the same bytes (SPEC section 3).

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function adler32(bytes) {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    a = (a + bytes[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

// DEFLATE length codes 257..285: base lengths and extra bits (RFC 1951).
const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

function lengthCodeIndex(length) {
  let i = LENGTH_BASE.length - 1;
  while (LENGTH_BASE[i] > length) i -= 1;
  return i;
}
function distCodeIndex(dist) {
  let i = DIST_BASE.length - 1;
  while (DIST_BASE[i] > dist) i -= 1;
  return i;
}

class BitWriter {
  constructor() {
    this.bytes = [];
    this.acc = 0;
    this.count = 0;
  }
  bits(value, length) {
    this.acc |= value << this.count;
    this.count += length;
    while (this.count >= 8) {
      this.bytes.push(this.acc & 0xff);
      this.acc >>>= 8;
      this.count -= 8;
    }
  }
  // Huffman codes are emitted most-significant-bit first.
  code(value, length) {
    let reversed = 0;
    for (let i = 0; i < length; i += 1) reversed = (reversed << 1) | ((value >>> i) & 1);
    this.bits(reversed, length);
  }
  finish() {
    if (this.count > 0) this.bytes.push(this.acc & 0xff);
    return Uint8Array.from(this.bytes);
  }
}

function literalCode(writer, symbol) {
  if (symbol < 144) writer.code(0x30 + symbol, 8);
  else writer.code(0x190 + (symbol - 144), 9);
}
function lengthCode(writer, codeIndex) {
  const symbol = 257 + codeIndex;
  if (symbol < 280) writer.code(symbol - 256, 7);
  else writer.code(0xc0 + (symbol - 280), 8);
}

// LZ77 with hash chains over the raw scanline data; greedy matching is
// deterministic, so output bytes depend only on the input bytes.
export function deflateFixed(data) {
  const writer = new BitWriter();
  writer.bits(1, 1); // BFINAL
  writer.bits(1, 2); // BTYPE = 01 fixed Huffman
  const HASH_BITS = 15;
  const head = new Int32Array(1 << HASH_BITS).fill(-1);
  const prev = new Int32Array(data.length).fill(-1);
  const hashAt = (i) => ((data[i] * 251 ^ data[i + 1] * 11 ^ data[i + 2] * 5) & ((1 << HASH_BITS) - 1)) >>> 0;
  let i = 0;
  while (i < data.length) {
    let bestLen = 0;
    let bestDist = 0;
    if (i + 2 < data.length) {
      let candidate = head[hashAt(i)];
      let attempts = 0;
      while (candidate >= 0 && attempts < 64) {
        const dist = i - candidate;
        if (dist > 32768) break;
        let len = 0;
        const maxLen = Math.min(258, data.length - i);
        while (len < maxLen && data[candidate + len] === data[i + len]) len += 1;
        if (len >= 3 && len > bestLen) {
          bestLen = len;
          bestDist = dist;
          if (len >= maxLen) break;
        }
        candidate = prev[candidate];
        attempts += 1;
      }
    }
    if (bestLen >= 3) {
      const li = lengthCodeIndex(bestLen);
      lengthCode(writer, li);
      if (LENGTH_EXTRA[li] > 0) writer.bits(bestLen - LENGTH_BASE[li], LENGTH_EXTRA[li]);
      const di = distCodeIndex(bestDist);
      writer.code(di, 5);
      if (DIST_EXTRA[di] > 0) writer.bits(bestDist - DIST_BASE[di], DIST_EXTRA[di]);
      for (let j = i; j < i + bestLen; j += 1) {
        if (j + 2 < data.length) {
          const h = hashAt(j);
          prev[j] = head[h];
          head[h] = j;
        }
      }
      i += bestLen;
    } else {
      literalCode(writer, data[i]);
      if (i + 2 < data.length) {
        const h = hashAt(i);
        prev[i] = head[h];
        head[h] = i;
      }
      i += 1;
    }
  }
  writer.code(0, 7); // symbol 256, end of block (7-bit fixed code 0000000)
  return writer.finish();
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcInput = out.subarray(4, 8 + data.length);
  view.setUint32(8 + data.length, crc32(crcInput));
  return out;
}

export function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const compressed = deflateFixed(raw);
  const zlib = new Uint8Array(2 + compressed.length + 4);
  zlib[0] = 0x78;
  zlib[1] = 0x9c;
  zlib.set(compressed, 2);
  new DataView(zlib.buffer).setUint32(2 + compressed.length, adler32(raw));
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const parts = [
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}
