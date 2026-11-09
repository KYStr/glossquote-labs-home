// Pure core for the UUID Generator and Inspector (RFC 9562).
//
// Zero DOM access, zero ambient randomness or clock: the byte source
// and the clock are injected, so every behaviour here is testable
// deterministically (SPEC sections 4, 5 and 7). In production the
// adapter supplies crypto.getRandomValues and Date.now; this module
// never calls a global random source anywhere.

const HEX = "0123456789abcdef";

// Version names keyed by the version nibble (SPEC section 2).
export const VERSION_NAMES = Object.freeze({
  0: "reserved-nil-range",
  1: "time-based",
  2: "dce-security",
  3: "md5-name",
  4: "random",
  5: "sha1-name",
  6: "reordered-time",
  7: "unix-time",
  8: "custom",
});

// Variant kinds keyed by the top-bits class of group 4's first digit
// (SPEC section 4): 0-7 NCS, 8-B RFC 9562, C-D Microsoft, E-F reserved.
export function variantKind(digit) {
  const value = Number.parseInt(digit, 16);
  if (value <= 7) return "ncs-legacy";
  if (value <= 11) return "rfc9562";
  if (value <= 13) return "microsoft-legacy";
  return "reserved";
}

export function formatBytes(bytes, { uppercase = false, hyphens = true } = {}) {
  if (!bytes || bytes.length !== 16) throw new Error("A UUID is exactly 16 bytes.");
  let digits = "";
  for (const byte of bytes) {
    digits += HEX[(byte >> 4) & 0xf] + HEX[byte & 0xf];
  }
  if (uppercase) digits = digits.toUpperCase();
  if (!hyphens) return digits;
  return [
    digits.slice(0, 8),
    digits.slice(8, 12),
    digits.slice(12, 16),
    digits.slice(16, 20),
    digits.slice(20, 32),
  ].join("-");
}

function maskV4(bytes, offset) {
  bytes[offset + 6] = 0x40 | (bytes[offset + 6] & 0x0f);
  bytes[offset + 8] = 0x80 | (bytes[offset + 8] & 0x3f);
}

function maskV7(bytes, offset, ms) {
  // 48-bit big-endian Unix epoch milliseconds in bytes 0-5 (RFC 9562
  // section 5.7); ms is below 2^48 for any realistic clock reading.
  const value = Math.floor(ms);
  bytes[offset] = Math.floor(value / 2 ** 40) & 0xff;
  bytes[offset + 1] = Math.floor(value / 2 ** 32) & 0xff;
  bytes[offset + 2] = Math.floor(value / 2 ** 24) & 0xff;
  bytes[offset + 3] = Math.floor(value / 2 ** 16) & 0xff;
  bytes[offset + 4] = Math.floor(value / 2 ** 8) & 0xff;
  bytes[offset + 5] = value & 0xff;
  bytes[offset + 6] = 0x70 | (bytes[offset + 6] & 0x0f);
  bytes[offset + 8] = 0x80 | (bytes[offset + 8] & 0x3f);
}

// Count validation (SPEC section 4): an integer 1-1000; anything else
// is an inline error and generation is refused — no silent clamping.
export function validateCount(raw) {
  const text = String(raw ?? "").trim();
  if (!/^[+-]?\d+$/.test(text)) return { ok: false, code: "COUNT_INVALID" };
  const count = Number(text);
  if (!Number.isInteger(count) || count < 1 || count > 1000) {
    return { ok: false, code: "COUNT_INVALID" };
  }
  return { ok: true, count };
}

// Generate a batch. fillRandom fills a Uint8Array from the CSPRNG;
// nowMs supplies the generation instant for v7. One batched fill call
// covers the whole batch's byte needs (SPEC section 4).
export function generateBatch({ version, count, uppercase = false, hyphens = true, fillRandom, nowMs }) {
  if (version !== 4 && version !== 7) throw new Error("Only versions 4 and 7 are generated.");
  const checked = validateCount(count);
  if (!checked.ok) return { ok: false, code: checked.code };
  if (typeof fillRandom !== "function") throw new Error("A randomness source is required.");
  const bytes = new Uint8Array(checked.count * 16);
  fillRandom(bytes);
  const ms = version === 7 ? nowMs() : 0;
  const values = [];
  for (let index = 0; index < checked.count; index += 1) {
    const offset = index * 16;
    if (version === 4) maskV4(bytes, offset);
    else maskV7(bytes, offset, ms);
    values.push(formatBytes(bytes.subarray(offset, offset + 16), { uppercase, hyphens }));
  }
  return { ok: true, values };
}

// Batch text (SPEC section 4): values joined with LF and a final LF.
export function batchText(values) {
  return values.join("\n") + "\n";
}

const ASCII_WS = /^[\t\n\v\f\r ]+|[\t\n\v\f\r ]+$/g;
const HYPHEN_POSITIONS = new Set([8, 13, 18, 23]);

// Strict inspector parser (SPEC section 4). Error order: empty, then
// wrong length, then hyphen misplaced (position), then non-hex
// (position and the single character, never more).
export function inspectUuid(raw) {
  const input = String(raw ?? "").replace(ASCII_WS, "");
  if (input.length === 0) return { ok: false, code: "EMPTY" };
  if (input.length !== 36 && input.length !== 32) {
    return { ok: false, code: "WRONG_LENGTH", length: input.length };
  }
  const hyphenated = input.length === 36;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === "-") {
      if (!hyphenated || !HYPHEN_POSITIONS.has(index)) {
        return { ok: false, code: "HYPHEN_MISPLACED", position: index + 1 };
      }
    } else if (hyphenated && HYPHEN_POSITIONS.has(index)) {
      return { ok: false, code: "HYPHEN_MISPLACED", position: index + 1 };
    }
  }
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (hyphenated && HYPHEN_POSITIONS.has(index)) continue;
    if (!/[0-9a-fA-F]/.test(char)) {
      return { ok: false, code: "NON_HEX", position: index + 1, char };
    }
  }

  const digits = input.replaceAll("-", "").toLowerCase();
  const canonical = [
    digits.slice(0, 8),
    digits.slice(8, 12),
    digits.slice(12, 16),
    digits.slice(16, 20),
    digits.slice(20, 32),
  ].join("-");
  const groups = canonical.split("-");
  const isNil = /^0{32}$/.test(digits);
  const isMax = /^f{32}$/.test(digits);
  const versionNibble = Number.parseInt(digits[12], 16);
  const variantDigit = digits[16].toUpperCase();
  const variant = variantKind(digits[16]);

  let timestamp = { kind: "none" };
  if (!isNil && !isMax) {
    if (versionNibble === 7) {
      const ms = Number.parseInt(digits.slice(0, 12), 16);
      timestamp = { kind: "unix-ms", ms, iso: new Date(ms).toISOString() };
    } else if (versionNibble === 1) {
      // 60-bit Gregorian timestamp, exact BigInt arithmetic (SPEC
      // section 4): subtract the Gregorian-to-Unix offset in
      // 100 ns intervals, divide by 10,000 with truncation.
      const timeLow = BigInt(`0x${digits.slice(0, 8)}`);
      const timeMid = BigInt(`0x${digits.slice(8, 12)}`);
      const timeHi = BigInt(`0x${digits.slice(12, 16)}`) & 0xfffn;
      const gregorian = (timeHi << 48n) | (timeMid << 32n) | timeLow;
      const unixIntervals = gregorian - 122192928000000000n;
      const ms = Number(unixIntervals / 10000n);
      timestamp = { kind: "unix-ms", ms, iso: new Date(ms).toISOString() };
    } else if (versionNibble === 6) {
      timestamp = { kind: "v6-not-decoded" };
    }
  }

  return {
    ok: true,
    canonical,
    digits,
    groups,
    isNil,
    isMax,
    versionNibble,
    versionName: versionNibble <= 8 ? VERSION_NAMES[versionNibble] : "reserved-future",
    variantDigit,
    variant,
    // Version semantics assume the RFC 9562 standard variant; other
    // variants carry the caveat (SPEC section 4).
    versionCaveat: !isNil && !isMax && variant !== "rfc9562",
    timestamp,
  };
}
