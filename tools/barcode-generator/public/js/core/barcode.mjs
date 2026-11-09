// Barcode Generator core: validators, encoders, sizing, geometry and SVG
// serialisation for Code 128 (sets B/C), EAN-13 and UPC-A, exactly as pinned
// by docs/specs/barcode-generator/SPEC.md section 4. Pure functions only:
// no DOM, no network, no storage. The module string ('1' = bar, '0' = space)
// is the single source of truth for preview, facts and both downloads.
import {
  CODE128_START_B,
  CODE128_START_C,
  CODE128_SWITCH_TO_B,
  CODE128_SWITCH_TO_C,
  code128SymbolModules,
} from "./code128-patterns.mjs";
import {
  EAN_FIRST_DIGIT_PARITY,
  EAN_L_PATTERNS,
  eanGPattern,
  eanRPattern,
} from "./ean-patterns.mjs";

export const SYMBOLOGIES = Object.freeze(["code128", "ean13", "upca"]);
export const CODE128_MAX_LENGTH = 48;
export const CODE128_QUIET_ZONE = 10;
export const EAN_QUIET_LEFT = 11;
export const EAN_QUIET_RIGHT = 7;
export const UPC_QUIET_ZONE = 9;

function failure(code, params = {}) {
  return { ok: false, error: { code, ...params } };
}

// ---------------------------------------------------------------- Code 128

function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}

// Segment the payload into maximal digit runs and non-digit spans.
function segmentRuns(payload) {
  const segments = [];
  let i = 0;
  while (i < payload.length) {
    const digit = isDigit(payload[i]);
    let j = i + 1;
    while (j < payload.length && isDigit(payload[j]) === digit) j += 1;
    segments.push({ digit, text: payload.slice(i, j) });
    i = j;
  }
  return segments;
}

// SPEC section 4 auto-switch rule: digit runs of length >= 4 are encoded in
// set C; an odd-length such run donates its first digit to set B. Runs of
// length <= 3 stay in B. The start set is C only when the payload begins
// with an even-length run >= 4. No switch is emitted after the final symbol.
export function encodeCode128(payload) {
  if (typeof payload !== "string" || payload.length === 0) {
    return failure("empty");
  }
  if (payload.length > CODE128_MAX_LENGTH) {
    return failure("too-long", { max: CODE128_MAX_LENGTH, actual: payload.length });
  }
  for (let i = 0; i < payload.length; i += 1) {
    const code = payload.charCodeAt(i);
    if (code < 32 || code > 126) {
      return failure("invalid-character", {
        char: payload[i],
        codePoint: code,
        position: i + 1,
      });
    }
  }

  const segments = segmentRuns(payload);
  const first = segments[0];
  const startInC = first.digit && first.text.length >= 4 && first.text.length % 2 === 0;
  const values = [startInC ? CODE128_START_C : CODE128_START_B];
  let inC = startInC;

  const emitDigitRunInC = (text) => {
    for (let i = 0; i < text.length; i += 2) {
      values.push(Number(text.slice(i, i + 2)));
    }
  };
  const emitInB = (text) => {
    for (const ch of text) values.push(ch.charCodeAt(0) - 32);
  };

  for (const segment of segments) {
    if (!segment.digit) {
      if (inC) {
        values.push(CODE128_SWITCH_TO_B);
        inC = false;
      }
      emitInB(segment.text);
      continue;
    }
    const run = segment.text;
    if (run.length <= 3) {
      if (inC) {
        values.push(CODE128_SWITCH_TO_B);
        inC = false;
      }
      emitInB(run);
      continue;
    }
    // Run of length >= 4: C encoding, odd runs donate their first digit to B.
    let rest = run;
    if (rest.length % 2 === 1) {
      if (inC) {
        values.push(CODE128_SWITCH_TO_B);
        inC = false;
      }
      emitInB(rest[0]);
      rest = rest.slice(1);
    }
    if (!inC) {
      values.push(CODE128_SWITCH_TO_C);
      inC = true;
    }
    emitDigitRunInC(rest);
  }

  let weighted = values[0];
  for (let i = 1; i < values.length; i += 1) weighted += i * values[i];
  const check = weighted % 103;
  values.push(check);

  const coreModules = values.map(code128SymbolModules).join("") + code128SymbolModules(106);
  const modules = "0".repeat(CODE128_QUIET_ZONE) + coreModules + "0".repeat(CODE128_QUIET_ZONE);
  return {
    ok: true,
    symbology: "code128",
    payload,
    values,
    checkDigit: null,
    symbolCount: values.length, // start + data/switches + checksum (stop counted in modules)
    coreModules,
    modules,
    totalModules: modules.length,
    quietLeft: CODE128_QUIET_ZONE,
    quietRight: CODE128_QUIET_ZONE,
    humanText: [{ text: payload, centerModules: modules.length / 2 }],
  };
}

// ------------------------------------------------------------- EAN / UPC

function validateDigits(input, lengths) {
  if (typeof input !== "string" || input.length === 0) return failure("empty");
  for (let i = 0; i < input.length; i += 1) {
    if (!isDigit(input[i])) {
      return failure("non-digit", { char: input[i], position: i + 1 });
    }
  }
  if (!lengths.includes(input.length)) {
    return failure("wrong-length", { expected: [...lengths], actual: input.length });
  }
  return { ok: true };
}

// EAN-13 check digit: weights 1 (odd positions) / 3 (even), from the left.
export function ean13CheckDigit(first12) {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const d = Number(first12[i]);
    sum += i % 2 === 0 ? d : 3 * d;
  }
  return (10 - (sum % 10)) % 10;
}

// UPC-A check digit: weights 3 (odd positions) / 1 (even), from the left.
export function upcaCheckDigit(first11) {
  let sum = 0;
  for (let i = 0; i < 11; i += 1) {
    const d = Number(first11[i]);
    sum += i % 2 === 0 ? 3 * d : d;
  }
  return (10 - (sum % 10)) % 10;
}

export function encodeEan13(input) {
  const valid = validateDigits(input, [12, 13]);
  if (!valid.ok) return valid;
  const first12 = input.slice(0, 12);
  const check = ean13CheckDigit(first12);
  if (input.length === 13 && Number(input[12]) !== check) {
    return failure("check-digit-mismatch", { expected: check, actual: Number(input[12]) });
  }
  const digits = first12 + String(check);
  const parity = EAN_FIRST_DIGIT_PARITY[Number(digits[0])];
  let core = "101";
  for (let i = 0; i < 6; i += 1) {
    const d = Number(digits[1 + i]);
    core += parity[i] === "L" ? EAN_L_PATTERNS[d] : eanGPattern(d);
  }
  core += "01010";
  for (let i = 0; i < 6; i += 1) core += eanRPattern(Number(digits[7 + i]));
  core += "101";
  const modules = "0".repeat(EAN_QUIET_LEFT) + core + "0".repeat(EAN_QUIET_RIGHT);
  const humanText = [{ text: digits[0], centerModules: EAN_QUIET_LEFT / 2 }];
  for (let i = 0; i < 6; i += 1) {
    humanText.push({ text: digits[1 + i], centerModules: EAN_QUIET_LEFT + 3 + 7 * i + 3.5 });
  }
  for (let i = 0; i < 6; i += 1) {
    humanText.push({
      text: digits[7 + i],
      centerModules: EAN_QUIET_LEFT + 3 + 42 + 5 + 7 * i + 3.5,
    });
  }
  return {
    ok: true,
    symbology: "ean13",
    payload: digits,
    inputDigits: input,
    checkDigit: check,
    symbolCount: 13,
    coreModules: core,
    modules,
    totalModules: modules.length,
    quietLeft: EAN_QUIET_LEFT,
    quietRight: EAN_QUIET_RIGHT,
    humanText,
  };
}

export function encodeUpca(input) {
  const valid = validateDigits(input, [11, 12]);
  if (!valid.ok) return valid;
  const first11 = input.slice(0, 11);
  const check = upcaCheckDigit(first11);
  if (input.length === 12 && Number(input[11]) !== check) {
    return failure("check-digit-mismatch", { expected: check, actual: Number(input[11]) });
  }
  const digits = first11 + String(check);
  let core = "101";
  for (let i = 0; i < 6; i += 1) core += EAN_L_PATTERNS[Number(digits[i])];
  core += "01010";
  for (let i = 0; i < 6; i += 1) core += eanRPattern(Number(digits[6 + i]));
  core += "101";
  const modules = "0".repeat(UPC_QUIET_ZONE) + core + "0".repeat(UPC_QUIET_ZONE);
  const humanText = [{ text: digits[0], centerModules: UPC_QUIET_ZONE / 2 }];
  for (let i = 0; i < 5; i += 1) {
    humanText.push({ text: digits[1 + i], centerModules: UPC_QUIET_ZONE + 3 + 7 * i + 3.5 });
  }
  for (let i = 0; i < 5; i += 1) {
    humanText.push({
      text: digits[6 + i],
      centerModules: UPC_QUIET_ZONE + 3 + 42 + 5 + 7 * i + 3.5,
    });
  }
  humanText.push({ text: digits[11], centerModules: UPC_QUIET_ZONE + 95 + UPC_QUIET_ZONE / 2 });
  return {
    ok: true,
    symbology: "upca",
    payload: digits,
    inputDigits: input,
    checkDigit: check,
    symbolCount: 12,
    coreModules: core,
    modules,
    totalModules: modules.length,
    quietLeft: UPC_QUIET_ZONE,
    quietRight: UPC_QUIET_ZONE,
    humanText,
  };
}

export function encode(symbology, input) {
  if (symbology === "code128") return encodeCode128(input);
  if (symbology === "ean13") return encodeEan13(input);
  if (symbology === "upca") return encodeUpca(input);
  return failure("unknown-symbology", { symbology });
}

// ---------------------------------------------------------------- Sizing

// X is handled as integer hundredths of a millimetre (step 0.01), so the
// physical width (total modules x X) is exact to 2 decimals by construction.
export function totalWidthMm(totalModules, xHundredths) {
  const hundredths = totalModules * xHundredths;
  const whole = Math.floor(hundredths / 100);
  const frac = hundredths % 100;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

// Round half away from zero for a non-negative rational num/den.
function roundHalfAwayFromZero(num, den) {
  return Math.floor((2 * num + den) / (2 * den));
}

// SPEC 2(e): PNG height in px = round(barHeightMm / X x scale).
export function pngHeightPx(barHeightMm, xHundredths, scale) {
  return roundHalfAwayFromZero(barHeightMm * 100 * scale, xHundredths);
}

export function pngWidthPx(totalModules, scale) {
  return totalModules * scale;
}

// Bar runs of a module string: [{ x, width }] in module units.
export function barRuns(modules) {
  const runs = [];
  let i = 0;
  while (i < modules.length) {
    if (modules[i] === "1") {
      let j = i + 1;
      while (j < modules.length && modules[j] === "1") j += 1;
      runs.push({ x: i, width: j - i });
      i = j;
    } else {
      i += 1;
    }
  }
  return runs;
}

// ------------------------------------------------------------ SVG output

function escapeXml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatModules(value) {
  return String(Math.round(value * 1000) / 1000);
}

// Deterministic SVG in module units (SPEC 2(e)): viewBox width is the total
// module count including quiet zones. Human-readable text segments are
// XML-escaped; the payload only ever appears as escaped text or bars.
export function buildSvg(result, { barHeightMm, xHundredths, showText }) {
  const barHeight = formatModules((barHeightMm * 100) / xHundredths);
  const textBand = showText ? 10 : 0;
  const height = formatModules((barHeightMm * 100) / xHundredths + textBand);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${result.totalModules} ${height}" width="${result.totalModules}" height="${height}">`,
    `<rect x="0" y="0" width="${result.totalModules}" height="${height}" fill="#ffffff"/>`,
  ];
  for (const run of barRuns(result.modules)) {
    parts.push(`<rect x="${run.x}" y="0" width="${run.width}" height="${barHeight}" fill="#000000"/>`);
  }
  if (showText) {
    const y = formatModules((barHeightMm * 100) / xHundredths + 8.5);
    for (const segment of result.humanText) {
      parts.push(
        `<text x="${formatModules(segment.centerModules)}" y="${y}" font-family="monospace" font-size="8" text-anchor="middle" fill="#000000">${escapeXml(segment.text)}</text>`,
      );
    }
  }
  parts.push("</svg>");
  return parts.join("\n") + "\n";
}

export const SAMPLES = Object.freeze({
  code128: "SKU-1024",
  ean13: "590123412345",
  upca: "03600029145",
});

export const DEFAULT_BAR_HEIGHT_MM = Object.freeze({
  code128: 25,
  ean13: 22,
  upca: 22,
});

export const FILE_SLUGS = Object.freeze({
  code128: "code128",
  ean13: "ean13",
  upca: "upca",
});
