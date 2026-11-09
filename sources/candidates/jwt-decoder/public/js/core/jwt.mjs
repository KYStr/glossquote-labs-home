// Pure core for the JWT Decoder and Claims Inspector.
//
// This module decodes a compact three-part token. It never verifies a
// signature, never fetches a key, and never judges an alg value: it
// splits, strictly decodes base64url, validates that header and payload
// are UTF-8 JSON objects, and annotates the claims exactly as SPEC
// section 4 prescribes. The clock is injected (nowSeconds) so every
// time readout is testable. Zero DOM access, zero dependencies.

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const VALUES = new Map([...ALPHABET].map((ch, index) => [ch, index]));
const ASCII_WHITESPACE = new Set([" ", "\t", "\n", "\r", "\f", "\v"]);

export const MAX_TOKEN_LENGTH = 16384;

export class JwtError extends Error {
  constructor(code, params = {}) {
    super(code);
    this.name = "JwtError";
    this.code = code;
    this.params = params;
  }
}

function fail(code, params) {
  throw new JwtError(code, params);
}

export function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

// Strict base64url decoding of one part (SPEC section 4): the alphabet
// is A-Z a-z 0-9 - _ only; "=" is accepted solely as one or two trailing
// padding characters that complete the length; an unpadded length with
// mod 4 equal to 1 has no valid decoding and is an error.
export function decodePartBytes(partName, text) {
  let padding = 0;
  while (padding < text.length && text[text.length - 1 - padding] === "=") {
    padding += 1;
  }
  if (padding > 2) fail("INVALID_PADDING", { part: partName });
  const body = text.slice(0, text.length - padding);
  for (let index = 0; index < body.length; index += 1) {
    if (!VALUES.has(body[index])) {
      fail("INVALID_CHARACTER", {
        part: partName,
        position: index + 1,
        char: body[index],
      });
    }
  }
  if (body.length % 4 === 1) fail("INVALID_LENGTH", { part: partName });
  if (padding > 0 && (body.length + padding) % 4 !== 0) {
    fail("INVALID_PADDING", { part: partName });
  }
  const bytes = [];
  let acc = 0;
  let bits = 0;
  for (const ch of body) {
    acc = (acc << 6) | VALUES.get(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
      acc &= (1 << bits) - 1;
    }
  }
  return Uint8Array.from(bytes);
}

function decodeJsonObject(partName, text) {
  const bytes = decodePartBytes(partName, text);
  let decoded;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("INVALID_UTF8", { part: partName });
  }
  let value;
  try {
    value = JSON.parse(decoded);
  } catch (error) {
    const match = /position (\d+)/.exec(error?.message ?? "");
    fail("INVALID_JSON", {
      part: partName,
      position: match ? Number(match[1]) : null,
    });
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("NOT_JSON_OBJECT", { part: partName });
  }
  return value;
}

// Single largest unit, floor semantics (SPEC section 4): at least 48 h
// reads as whole days, at least 120 min as whole hours, at least 60 s
// as whole minutes, otherwise whole seconds. Compound phrasing such as
// "1 hour 29 minutes" is never produced.
export function relativeDelta(deltaSeconds) {
  const delta = Math.max(0, Math.floor(deltaSeconds));
  if (delta >= 172800) return { unit: "days", value: Math.floor(delta / 86400) };
  if (delta >= 7200) return { unit: "hours", value: Math.floor(delta / 3600) };
  if (delta >= 60) return { unit: "minutes", value: Math.floor(delta / 60) };
  return { unit: "seconds", value: delta };
}

function numericClaim(payload, name) {
  const value = payload[name];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// Decodes the token and returns the full display model. Throws JwtError
// with a stable code for every structural failure of SPEC section 4.
// An all-whitespace input is the empty state, not an error.
export function decodeJwt(rawInput, nowSeconds) {
  const input = String(rawInput ?? "");
  let start = 0;
  let end = input.length;
  while (start < end && ASCII_WHITESPACE.has(input[start])) start += 1;
  while (end > start && ASCII_WHITESPACE.has(input[end - 1])) end -= 1;
  const text = input.slice(start, end);
  if (text === "") return { empty: true };
  if (text.length > MAX_TOKEN_LENGTH) {
    fail("TOO_LONG", { limit: MAX_TOKEN_LENGTH });
  }
  for (let index = 0; index < text.length; index += 1) {
    if (ASCII_WHITESPACE.has(text[index])) {
      fail("WHITESPACE_INSIDE", { position: index + 1 });
    }
  }
  const parts = text.split(".");
  if (parts.length === 5) fail("JWE_LIKELY", { count: parts.length });
  if (parts.length !== 3) fail("PART_COUNT", { count: parts.length });
  const [headerText, payloadText, signatureText] = parts;
  if (headerText === "") fail("EMPTY_PART", { part: "header" });
  if (payloadText === "") fail("EMPTY_PART", { part: "payload" });

  const header = decodeJsonObject("header", headerText);
  const payload = decodeJsonObject("payload", payloadText);
  const signatureBytes = decodePartBytes("signature", signatureText).length;

  const headerSummary = [];
  for (const name of ["alg", "typ", "kid"]) {
    if (Object.hasOwn(header, name)) {
      headerSummary.push({
        name,
        value: header[name],
        isString: typeof header[name] === "string",
      });
    }
  }

  const claims = Object.entries(payload).map(([name, value]) => {
    const row = { name, value };
    if (name === "exp" || name === "nbf" || name === "iat") {
      if (typeof value === "number" && Number.isFinite(value)) {
        row.time = {
          seconds: value,
          utc: new Date(value * 1000).toISOString(),
          tense: value <= nowSeconds ? "past" : "future",
          relative: relativeDelta(Math.abs(nowSeconds - value)),
        };
      } else {
        row.warning = "NOT_NUMERICDATE";
      }
    } else if (name === "aud") {
      row.audience = Array.isArray(value)
        ? { list: true, count: value.length }
        : { list: false, count: 1 };
    }
    return row;
  });

  // Time status comes only from valid NumericDate exp/nbf claims and is
  // a statement about those claims against the device clock, never a
  // statement that the token is genuine (SPEC sections 2 and 4).
  const exp = numericClaim(payload, "exp");
  const nbf = numericClaim(payload, "nbf");
  let status;
  if (exp !== null && nowSeconds >= exp) status = "EXPIRED";
  else if (nbf !== null && nowSeconds < nbf) status = "NOT_YET_VALID";
  else if (exp !== null || nbf !== null) status = "WITHIN_STATED_WINDOW";
  else status = "NO_TIME_CLAIMS";

  return {
    empty: false,
    header,
    payload,
    headerJson: prettyJson(header),
    payloadJson: prettyJson(payload),
    headerSummary,
    claims,
    signatureText,
    signatureBytes,
    status,
    checkedAtSeconds: nowSeconds,
  };
}
