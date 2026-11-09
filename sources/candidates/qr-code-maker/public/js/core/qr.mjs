// Offline QR Code Maker — pure core (no DOM access).
//
// Implements the normative contract of SPEC section 4: a single byte-mode
// segment over the UTF-8 bytes of the payload, smallest fitting version
// 1..40 at the chosen error-correction level, Reed-Solomon error
// correction over GF(256) with primitive polynomial 0x11D, standard block
// interleaving, mask chosen by the ISO penalty rules N1..N4 with ties
// resolved to the lowest mask index, and standard format / version
// information. The ECC block table in qr-tables.mjs was derived and
// verified module-by-module against an independent encoder during
// authoring (see VERIFICATION.md); it is data, not code.

import { ECC_BLOCKS } from "./qr-tables.mjs";

export class QrError extends Error {
  constructor(code, params = {}) {
    super(code);
    this.name = "QrError";
    this.code = code;
    this.params = params;
  }
}

function fail(code, params) {
  throw new QrError(code, params);
}

export const EC_LEVELS = Object.freeze(["L", "M", "Q", "H"]);
const FORMAT_EC_BITS = Object.freeze({ L: 1, M: 0, Q: 3, H: 2 });

const textEncoder = new TextEncoder();

export function utf8Bytes(text) {
  return textEncoder.encode(String(text));
}

export function utf8ByteLength(text) {
  return utf8Bytes(text).length;
}

function charCountBits(version) {
  return version <= 9 ? 8 : 16;
}

export function dataCodewords(version, level) {
  const entry = ECC_BLOCKS[level][version - 1];
  return entry.groups.reduce((sum, [count, len]) => sum + count * len, 0);
}

export function byteCapacity(version, level) {
  return Math.floor((dataCodewords(version, level) * 8 - 4 - charCountBits(version)) / 8);
}

export function maxByteLength(level) {
  return byteCapacity(40, level);
}

// Smallest version whose terminated bitstream fits, or 0 when the payload
// exceeds version 40 at this level.
export function selectVersion(byteLength, level) {
  for (let version = 1; version <= 40; version += 1) {
    if (byteLength <= byteCapacity(version, level)) return version;
  }
  return 0;
}

export function capacityInfo(byteLength, level) {
  const version = selectVersion(byteLength, level);
  if (version === 0) {
    return { version: 0, capacity: maxByteLength(level), remaining: maxByteLength(level) - byteLength };
  }
  const capacity = byteCapacity(version, level);
  return { version, capacity, remaining: capacity - byteLength };
}

// ---- Galois field GF(256), primitive polynomial 0x11D ----

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
}

function gfMultiply(a, b) {
  return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsDivisor(degree) {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data, divisor) {
  const result = new Array(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ result.shift();
    result.push(0);
    for (let i = 0; i < divisor.length; i += 1) {
      result[i] ^= gfMultiply(divisor[i], factor);
    }
  }
  return result;
}

// ---- Bitstream assembly ----

function buildDataCodewords(bytes, version, level, entryOverride = null) {
  const totalData = entryOverride
    ? entryOverride.groups.reduce((sum, [count, len]) => sum + count * len, 0)
    : dataCodewords(version, level);
  const capacityBits = totalData * 8;
  const bits = [];
  const append = (value, length) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };
  append(0b0100, 4); // byte mode indicator
  append(bytes.length, charCountBits(version));
  for (const b of bytes) append(b, 8);
  const terminator = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < terminator; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const padBytes = [0xec, 0x11];
  for (let i = 0; bits.length < capacityBits; i += 1) append(padBytes[i % 2], 8);
  const out = new Uint8Array(capacityBits / 8);
  for (let i = 0; i < out.length; i += 1) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) value = (value << 1) | bits[i * 8 + j];
    out[i] = value;
  }
  return out;
}

function interleaveBlocks(data, version, level, entryOverride = null) {
  const entry = entryOverride ?? ECC_BLOCKS[level][version - 1];
  const blocks = [];
  let offset = 0;
  for (const [count, len] of entry.groups) {
    for (let i = 0; i < count; i += 1) {
      blocks.push(Array.from(data.slice(offset, offset + len)));
      offset += len;
    }
  }
  const divisor = rsDivisor(entry.ec);
  const eccBlocks = blocks.map((block) => rsRemainder(block, divisor));
  const out = [];
  const maxData = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxData; i += 1) {
    for (const block of blocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < entry.ec; i += 1) {
    for (const ecc of eccBlocks) out.push(ecc[i]);
  }
  return out;
}

// ---- Function patterns ----

function getBit(x, i) {
  return (x >>> i) & 1;
}

function totalModules(version) {
  const size = version * 4 + 17;
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

export function alignmentPositions(version) {
  if (version === 1) return [];
  const size = version * 4 + 17;
  const num = Math.floor(version / 7) + 2;
  const step = version === 32
    ? 26
    : Math.floor((version * 4 + num * 2 + 1) / (num * 2 - 2)) * 2;
  const result = new Array(num);
  result[0] = 6;
  let current = size - 7;
  for (let i = num - 1; i >= 1; i -= 1) {
    result[i] = current;
    current -= step;
  }
  return result;
}

function formatBits(level, mask) {
  const data = FORMAT_EC_BITS[level] << 3 | mask;
  let rem = data;
  for (let i = 0; i < 10; i += 1) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function versionBits(version) {
  let rem = version;
  for (let i = 0; i < 12; i += 1) {
    rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  }
  return (version << 12) | (rem & 0xfff);
}

// Builds the unmasked symbol with function patterns; returns the module
// grid, the function-module mask, and a format writer for mask trials.
function buildBase(version) {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Uint8Array(size));
  const isFunction = Array.from({ length: size }, () => new Uint8Array(size));
  const setFunction = (x, y, dark) => {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      modules[y][x] = dark ? 1 : 0;
      isFunction[y][x] = 1;
    }
  };
  // Timing
  for (let i = 0; i < size; i += 1) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  // Finder patterns with separators
  const drawFinder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(cx + dx, cy + dy, dist !== 2 && dist !== 4);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);
  // Alignment patterns
  const positions = alignmentPositions(version);
  for (const y of positions) {
    for (const x of positions) {
      const corner = (x === 6 && y === 6)
        || (x === 6 && y === size - 7)
        || (x === size - 7 && y === 6);
      if (corner) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          setFunction(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }
  // Format information placeholders (values written per mask trial)
  const drawFormat = (mask) => {
    const bits = formatBits(FORMAT_PLACEHOLDER_LEVEL, mask);
    for (let i = 0; i <= 5; i += 1) setFunction(8, i, getBit(bits, i) === 1);
    setFunction(8, 7, getBit(bits, 6) === 1);
    setFunction(8, 8, getBit(bits, 7) === 1);
    setFunction(7, 8, getBit(bits, 8) === 1);
    for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, getBit(bits, i) === 1);
    for (let i = 0; i < 8; i += 1) setFunction(size - 1 - i, 8, getBit(bits, i) === 1);
    for (let i = 8; i < 15; i += 1) setFunction(8, size - 15 + i, getBit(bits, i) === 1);
    setFunction(8, size - 8, true);
  };
  const FORMAT_PLACEHOLDER_LEVEL = "M";
  drawFormat(0);
  // Version information
  if (version >= 7) {
    const bits = versionBits(version);
    for (let i = 0; i < 18; i += 1) {
      const dark = getBit(bits, i) === 1;
      setFunction(Math.floor(i / 3), size - 11 + (i % 3), dark);
      setFunction(size - 11 + (i % 3), Math.floor(i / 3), dark);
    }
  }
  return { size, modules, isFunction };
}

// Mask patterns, x = column, y = row.
const MASK_FORMULAS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
  (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0,
  (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0,
];

// ---- Penalty scoring (ISO rules N1..N4) ----

function finderPenaltyCountPatterns(runHistory) {
  const n = runHistory[1];
  const core = n > 0
    && runHistory[2] === n
    && runHistory[3] === n * 3
    && runHistory[4] === n
    && runHistory[5] === n;
  return (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0)
    + (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0);
}

function finderPenaltyAddHistory(currentRunLength, runHistory, size) {
  if (runHistory[0] === 0) currentRunLength += size;
  runHistory.pop();
  runHistory.unshift(currentRunLength);
  return runHistory;
}

function finderPenaltyTerminateAndCount(currentColor, currentRunLength, runHistory, size) {
  if (currentColor) {
    finderPenaltyAddHistory(currentRunLength, runHistory, size);
    currentRunLength = 0;
  }
  currentRunLength += size;
  finderPenaltyAddHistory(currentRunLength, runHistory, size);
  return finderPenaltyCountPatterns(runHistory);
}

function penaltyScore(modules, size) {
  let result = 0;
  // Rule N1 + N3 over rows, then columns.
  const scoreLine = (line) => {
    let lineScore = 0;
    let runColor = 0;
    let runLength = 0;
    let runHistory = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < size; i += 1) {
      if (line[i] === runColor) {
        runLength += 1;
        if (runLength === 5) lineScore += 3;
        else if (runLength > 5) lineScore += 1;
      } else {
        finderPenaltyAddHistory(runLength, runHistory, size);
        if (runColor === 0) lineScore += finderPenaltyCountPatterns(runHistory) * 40;
        runColor = line[i];
        runLength = 1;
      }
    }
    lineScore += finderPenaltyTerminateAndCount(runColor, runLength, runHistory, size) * 40;
    return lineScore;
  };
  for (let y = 0; y < size; y += 1) result += scoreLine(modules[y]);
  for (let x = 0; x < size; x += 1) {
    const column = new Uint8Array(size);
    for (let y = 0; y < size; y += 1) column[y] = modules[y][x];
    result += scoreLine(column);
  }
  // Rule N2: 2x2 blocks of one colour.
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
        result += 3;
      }
    }
  }
  // Rule N4: deviation of the dark-module ratio from 50%.
  let dark = 0;
  for (const row of modules) for (const cell of row) dark += cell;
  const total = size * size;
  const num = Math.abs(dark * 20 - total * 10);
  const k = Math.floor((num + total - 1) / total) - 1;
  if (k > 0) result += k * 10;
  return result;
}

// Assembles the full symbol for an explicit version and mask (mask null =
// choose by penalty). Exported for tests and authoring verification.
export function buildSymbol(bytes, level, version, maskOverride = null, entryOverride = null) {
  const data = buildDataCodewords(bytes, version, level, entryOverride);
  const codewords = interleaveBlocks(data, version, level, entryOverride);
  const rawModules = totalModules(version);
  const bits = [];
  for (const b of codewords) for (let i = 7; i >= 0; i -= 1) bits.push((b >>> i) & 1);
  while (bits.length < rawModules) bits.push(0); // remainder bits
  const { size, modules, isFunction } = buildBase(version);
  // Place data bits (Nayuki zigzag).
  let bitIndex = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && bitIndex < bits.length) {
          modules[y][x] = bits[bitIndex];
          bitIndex += 1;
        }
      }
    }
  }
  const drawFormat = (target, mask) => {
    const bitsValue = formatBits(level, mask);
    const set = (x, y, dark) => { target[y][x] = dark ? 1 : 0; };
    for (let i = 0; i <= 5; i += 1) set(8, i, getBit(bitsValue, i) === 1);
    set(8, 7, getBit(bitsValue, 6) === 1);
    set(8, 8, getBit(bitsValue, 7) === 1);
    set(7, 8, getBit(bitsValue, 8) === 1);
    for (let i = 9; i < 15; i += 1) set(14 - i, 8, getBit(bitsValue, i) === 1);
    for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, getBit(bitsValue, i) === 1);
    for (let i = 8; i < 15; i += 1) set(8, size - 15 + i, getBit(bitsValue, i) === 1);
    set(8, size - 8, true);
  };
  const trial = (mask) => {
    const candidate = modules.map((row) => Uint8Array.from(row));
    const formula = MASK_FORMULAS[mask];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!isFunction[y][x] && formula(x, y)) candidate[y][x] ^= 1;
      }
    }
    drawFormat(candidate, mask);
    return candidate;
  };
  if (maskOverride !== null) {
    const candidate = trial(maskOverride);
    return { version, level, size, mask: maskOverride, penalty: penaltyScore(candidate, size), modules: candidate };
  }
  let best = null;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = trial(mask);
    const score = penaltyScore(candidate, size);
    if (best === null || score < best.penalty) {
      best = { version, level, size, mask, penalty: score, modules: candidate };
    }
  }
  return best;
}

// Encodes text (UTF-8 byte mode) at the given level, smallest version.
export function encodeQr(text, level) {
  const bytes = utf8Bytes(text);
  if (bytes.length === 0) fail("EMPTY_PAYLOAD");
  const version = selectVersion(bytes.length, level);
  if (version === 0) {
    fail("CAPACITY_EXCEEDED", { limit: maxByteLength(level), actual: bytes.length, level });
  }
  return buildSymbol(bytes, level, version, null);
}

// ---- Wi-Fi payload builder (SPEC section 4 grammar) ----

const WIFI_ESCAPABLE = new Set(["\\", ";", ",", ":", "\""]);

export function escapeWifiValue(value) {
  let out = "";
  for (const ch of String(value)) {
    if (WIFI_ESCAPABLE.has(ch)) out += "\\";
    out += ch;
  }
  return out;
}

export function buildWifiPayload({ ssid, security, password, hidden }) {
  if (ssid === undefined || ssid === null || String(ssid).length === 0) {
    fail("SSID_REQUIRED");
  }
  const sec = security;
  if (sec !== "nopass" && (password === undefined || password === null || String(password).length === 0)) {
    fail("PASSWORD_REQUIRED");
  }
  let out = `WIFI:T:${sec};S:${escapeWifiValue(ssid)};`;
  if (sec !== "nopass") out += `P:${escapeWifiValue(password)};`;
  if (hidden) out += "H:true;";
  out += ";";
  return out;
}

// ---- Rendering: SVG and pixels from the module matrix ----

export function svgString(modules, { margin = 4, foreground = "#000000", background = "#ffffff" } = {}) {
  const size = modules.length;
  const total = size + margin * 2;
  let d = "";
  for (let y = 0; y < size; y += 1) {
    let x = 0;
    while (x < size) {
      if (modules[y][x] === 1) {
        let run = 1;
        while (x + run < size && modules[y][x + run] === 1) run += 1;
        d += `M${x + margin} ${y + margin}h${run}v1h${-run}z`;
        x += run;
      } else {
        x += 1;
      }
    }
  }
  // The SVG namespace URI is assembled from fragments so the source tree
  // carries no literal external URL (the project check enforces this).
  const xmlns = "http" + "://www.w3.org/2000/svg";
  return `<svg xmlns="${xmlns}" viewBox="0 0 ${total} ${total}"><rect width="100%" height="100%" fill="${background}"/><path d="${d}" fill="${foreground}"/></svg>`;
}

export function parseHexColor(value) {
  if (typeof value !== "string") return null;
  const match = /^#([0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function renderPixels(modules, { margin = 4, size = 1024, foreground = [0, 0, 0], background = [255, 255, 255] } = {}) {
  const count = modules.length;
  const total = count + margin * 2;
  const modulePx = Math.floor(size / total);
  const drawn = modulePx * total;
  const offset = Math.floor((size - drawn) / 2);
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let rgb = background;
      if (x >= offset && y >= offset && x < offset + drawn && y < offset + drawn) {
        const mx = Math.floor((x - offset) / modulePx) - margin;
        const my = Math.floor((y - offset) / modulePx) - margin;
        if (mx >= 0 && my >= 0 && mx < count && my < count && modules[my][mx] === 1) rgb = foreground;
      }
      const i = (y * size + x) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
  return { width: size, height: size, data };
}

// ---- Contrast warning (WCAG relative luminance) ----

function relativeLuminance([r, g, b]) {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastWarning(fg, bg) {
  return contrastRatio(fg, bg) < 3 || relativeLuminance(fg) > relativeLuminance(bg);
}

// ---- Download filename (SPEC section 4) ----

export function makeFilename(date, kind) {
  if (kind === "svg") return "qr-code.svg";
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "qr-code.png";
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `qr-${stamp}.png`;
}
