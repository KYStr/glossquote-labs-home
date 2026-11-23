// Pure core for the Unix Timestamp Converter
// (spec-unix-timestamp-converter-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or host timezone. The only environment
// input is the browser/Node built-in IANA time-zone database, reached
// exclusively through `Intl.DateTimeFormat` with an explicit
// `timeZone` — exactly as SPEC §inputsOutputs rule 5 pins ("時區偏移
// 一律以 Intl.DateTimeFormat 帶明確 timeZone 取用瀏覽器內建 IANA
// 時區資料庫"). No clock-constructor object is built anywhere in this
// file: civil <-> absolute conversions use Howard Hinnant's integer
// days_from_civil algorithm, and timestamps are carried as BigInt
// milliseconds until the final safe-integer conversion, so no
// floating-point second ever participates.
//
// SPEC-pinned rules applied here, in the SPEC's fixed validation
// order (capacity, surrogate, empty, grammar, then cross-field):
//   - timestamp raw at most 16 units; ASCII decimal, optional
//     leading `-`, optional one decimal point with 1-3 digits;
//     anything else is INTEGER_FORMAT.
//   - unit auto-detect on |integer part| N: N >= 10^12 is
//     milliseconds, N < 10^11 is seconds, 10^11 <= N < 10^12 is
//     AMBIGUOUS_UNIT. Seconds accept 1-3 fractional digits
//     (0.5 s = 500 ms); milliseconds accept integers only.
//   - negative fractions floor toward -infinity: -1.5 s = -1,500 ms,
//     -0.001 s = -1 ms. timestampSeconds is the floor division of
//     timestampMs by 1000 (the SPEC pins the floor direction for the
//     millisecond conversion but does not spell out timestampSeconds
//     for negative fractions; floor keeps timestampMs =
//     timestampSeconds * 1000 + a 0-999 remainder — recorded in
//     HANDOFF.md as a documented interpretation).
//   - range: seconds -62,135,596,800..253,402,300,799, i.e.
//     milliseconds -62,135,596,800,000..253,402,300,799,999
//     (0001-01-01 through 9999-12-31T23:59:59Z); outside is RANGE.
//   - date must be a real proleptic-Gregorian date (leap rule:
//     divisible by 4 and (not by 100 or by 400)); a nonexistent
//     calendar date such as 2026-02-29 is INVALID_DATE.
//   - time 00:00:00-23:59:59; a seconds value of 60 is
//     LEAP_SECOND_UNSUPPORTED (POSIX ignores leap seconds; 23:59:60
//     has no timestamp of its own).
//   - datetime -> timestamp resolves the local time in the chosen
//     zone by probing the zone offset around the local time,
//     iterating candidates, and round-tripping each candidate back
//     through the zone. No candidate round-trips: the local time
//     does not exist (DST gap) -> NONEXISTENT_LOCAL_TIME. Two
//     candidates round-trip: DST overlap -> the earlier (smaller
//     UTC) one wins and ambiguousLocalTime is true.
//   - displays are always UTC, Asia/Taipei, then the selected zone,
//     deduplicated when the selected zone repeats one of the first
//     two. ISO 8601 is YYYY-MM-DDTHH:MM:SS.sss with a Z suffix for
//     UTC and +/-HH:MM otherwise; RFC 2822 is
//     "Www, DD Mon YYYY HH:MM:SS +/-HHMM" with fixed English
//     three-letter weekday/month abbreviations.
//   - custom format: tokens YYYY MM DD HH mm ss SSS only; every
//     maximal run of consecutive letters must be exactly one token,
//     otherwise CUSTOM_FORMAT (the SPEC's literal rule — a compact
//     pattern such as "YYYYMMDD" is therefore rejected; see
//     HANDOFF.md). All other characters are literals.
//   - customPattern is validated only when format is "custom".
//   - datetime direction always reports unitDetected "milliseconds".
//
// Known SPEC tensions are NOT silently resolved here; they are listed
// as errata candidates in HANDOFF.md, notably: SPEC says
// "Asia/Taipei 固定 +08:00" while rule 5 also pins offsets to the
// Intl IANA database, which gives +08:06:00 (LMT) before 1896 and
// +09:00 (JST) for 1896-1945 — this implementation follows the
// operative rule 5 (Intl). Pre-standard-time LMT offsets carry
// seconds (e.g. America/New_York -04:56:02 in year 0001); the wall
// clock shown is exact, while the +/-HH:MM / +/-HHMM suffix is the
// offset rounded to the nearest minute, because the SPEC's suffix
// formats have no seconds field.

export const FIELDS = [
  "direction",
  "timestamp",
  "unit",
  "date",
  "time",
  "milliseconds",
  "timezone",
  "format",
  "customPattern",
];

export const DEFAULTS = {
  direction: "timestamp-to-datetime",
  timestamp: "",
  unit: "auto",
  date: "",
  time: "",
  milliseconds: "000",
  timezone: "Asia/Taipei",
  format: "iso8601",
  customPattern: "YYYY-MM-DD HH:mm:ss",
};

// The worked example is fixtures.json case 1 (epoch-zero) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  customPattern: "YYYY-MM-DD HH:mm:ss",
  date: "",
  direction: "timestamp-to-datetime",
  format: "iso8601",
  milliseconds: "000",
  time: "",
  timestamp: "0",
  timezone: "Asia/Taipei",
  unit: "auto",
};

export const ZONES = [
  "UTC",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

export const DIRECTIONS = ["timestamp-to-datetime", "datetime-to-timestamp"];
export const UNITS = ["auto", "seconds", "milliseconds"];
export const FORMATS = ["iso8601", "rfc2822", "custom"];

export const MAX_TIMESTAMP_RAW_UNITS = 16;
export const MAX_CUSTOM_PATTERN_UNITS = 64;
export const MAX_DATE_RAW_UNITS = 10;
export const MAX_TIME_RAW_UNITS = 8;
export const MAX_MILLISECONDS_RAW_UNITS = 3;

export const MIN_SECONDS = -62135596800;
export const MAX_SECONDS = 253402300799;
export const MIN_MS = -62135596800000;
export const MAX_MS = 253402300799999;
const MIN_MS_BIGINT = BigInt(MIN_MS);
const MAX_MS_BIGINT = BigInt(MAX_MS);

const POW_11 = 10n ** 11n;
const POW_12 = 10n ** 12n;

export const CUSTOM_TOKENS = ["YYYY", "MM", "DD", "HH", "mm", "ss", "SSS"];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked. Returns
// the raw string map, or null when the shape is not exactly the nine
// fields, all strings.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const raw = {};
  for (const field of FIELDS) {
    if (!keys.includes(field)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    raw[field] = descriptor.value;
  }
  return raw;
}

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Integer civil-date algorithms (Howard Hinnant's days_from_civil /
// civil_from_days, integer arithmetic only). days_from_civil returns
// days since 1970-01-01. All operands are small integers, so Number
// arithmetic here is exact integer arithmetic.
function floorDiv(a, b) {
  return Math.floor(a / b);
}

function daysFromCivil(year, month, day) {
  const y = month <= 2 ? year - 1 : year;
  const era = floorDiv(y, 400);
  const yoe = y - era * 400;
  const doy = floorDiv(153 * (month + (month > 2 ? -3 : 9)) + 2, 5) + day - 1;
  const doe = yoe * 365 + floorDiv(yoe, 4) - floorDiv(yoe, 100) + doy;
  return era * 146097 + doe - 719468;
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

// ---- Time-zone access (SPEC rule 5: Intl with an explicit timeZone) ----

const formatterCache = new Map();

function formatterFor(zone) {
  let formatter = formatterCache.get(zone);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(zone, formatter);
  }
  return formatter;
}

// Wall-clock civil fields of an absolute instant in a zone. The
// timestamp is passed as a plain number (milliseconds since the
// epoch); no clock-constructor object is involved.
function zoneParts(zone, utcMs) {
  const parts = formatterFor(zone).formatToParts(utcMs);
  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;
  let second = 0;
  for (const part of parts) {
    if (part.type === "year") year = Number(part.value);
    else if (part.type === "month") month = Number(part.value);
    else if (part.type === "day") day = Number(part.value);
    else if (part.type === "hour") hour = Number(part.value);
    else if (part.type === "minute") minute = Number(part.value);
    else if (part.type === "second") second = Number(part.value);
  }
  // Some engines report midnight as hour 24 with hourCycle h23.
  if (hour === 24) hour = 0;
  return { year, month, day, hour, minute, second };
}

function civilToMs(civil) {
  return (
    daysFromCivil(civil.year, civil.month, civil.day) * 86400000 +
    ((civil.hour * 60 + civil.minute) * 60 + civil.second) * 1000
  );
}

// Offset of a zone at an absolute instant, in milliseconds: the
// wall-clock reading of that instant, read as if it were UTC, minus
// the instant itself. Whole minutes in the modern era; may carry
// seconds for pre-standard-time LMT offsets. The instant is first
// truncated to whole seconds: the wall-clock parts carry no
// millisecond field, so the millisecond remainder must not leak
// into the offset (a 5 ms remainder would otherwise shift every
// candidate by 5 ms and break the round-trip check).
function offsetMsAt(zone, utcMs) {
  const wholeSeconds = utcMs - (((utcMs % 1000) + 1000) % 1000);
  return civilToMs(zoneParts(zone, utcMs)) - wholeSeconds;
}

// ---- Formatting ----

function pad2(value) {
  return String(value).padStart(2, "0");
}

function pad3(value) {
  return String(value).padStart(3, "0");
}

function pad4(value) {
  return String(value).padStart(4, "0");
}

// Offset suffix for ISO 8601 (+/-HH:MM) and RFC 2822 (+/-HHMM).
// The SPEC's suffix formats have no seconds field, so a sub-minute
// offset (LMT era only) is rounded to the nearest minute.
function formatOffset(offsetMs, withColon) {
  const minutes = Math.round(offsetMs / 60000);
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  const hours = pad2(Math.floor(absolute / 60));
  const mins = pad2(absolute % 60);
  return withColon ? `${sign}${hours}:${mins}` : `${sign}${hours}${mins}`;
}

function formatIso8601(parts, msPart, offsetSuffix) {
  return (
    `${pad4(parts.year)}-${pad2(parts.month)}-${pad2(parts.day)}` +
    `T${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}.${pad3(msPart)}` +
    offsetSuffix
  );
}

function formatRfc2822(parts, offsetRfc) {
  const days = daysFromCivil(parts.year, parts.month, parts.day);
  const weekday = ((days + 4) % 7 + 7) % 7;
  return (
    `${WEEKDAY_NAMES[weekday]}, ${pad2(parts.day)} ${MONTH_NAMES[parts.month - 1]} ` +
    `${pad4(parts.year)} ${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)} ${offsetRfc}`
  );
}

function formatCustom(pattern, parts, msPart) {
  const values = {
    YYYY: pad4(parts.year),
    MM: pad2(parts.month),
    DD: pad2(parts.day),
    HH: pad2(parts.hour),
    mm: pad2(parts.minute),
    ss: pad2(parts.second),
    SSS: pad3(msPart),
  };
  let output = "";
  let index = 0;
  while (index < pattern.length) {
    const char = pattern[index];
    if ((char >= "A" && char <= "Z") || (char >= "a" && char <= "z")) {
      let end = index + 1;
      while (
        end < pattern.length &&
        ((pattern[end] >= "A" && pattern[end] <= "Z") ||
          (pattern[end] >= "a" && pattern[end] <= "z"))
      ) {
        end += 1;
      }
      const run = pattern.slice(index, end);
      // Validation guarantees every letter run is exactly a token.
      output += values[run];
      index = end;
    } else {
      output += char;
      index += 1;
    }
  }
  return output;
}

function buildDisplays(timestampMs, timezone, format, customPattern) {
  const zones = ["UTC", "Asia/Taipei"];
  if (timezone !== "UTC" && timezone !== "Asia/Taipei") zones.push(timezone);
  const msPart = ((timestampMs % 1000) + 1000) % 1000;
  return zones.map((zone) => {
    const parts = zoneParts(zone, timestampMs);
    const offset = offsetMsAt(zone, timestampMs);
    const isoSuffix = zone === "UTC" ? "Z" : formatOffset(offset, true);
    const rfcOffset = zone === "UTC" ? "+0000" : formatOffset(offset, false);
    return {
      zone,
      iso8601: formatIso8601(parts, msPart, isoSuffix),
      rfc2822: formatRfc2822(parts, rfcOffset),
      custom: format === "custom" ? formatCustom(customPattern, parts, msPart) : null,
    };
  });
}

// ---- Validation helpers ----

const TIMESTAMP_PATTERN = /^(-?)(\d+)(?:\.(\d{1,3}))?$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2}):(\d{2})$/;
const MILLISECONDS_PATTERN = /^(\d{1,3})$/;
const LETTER_RUN_PATTERN = /[A-Za-z]+/g;

// Capacity, surrogate, empty, in that order; returns an error outcome
// or null when the raw string passes the three pre-grammar checks.
function preGrammarChecks(value, maxUnits, field) {
  if (value.length > maxUnits) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) return { error: failure("EMPTY", field) };
  return null;
}

function validateCustomPattern(pattern) {
  const pre = preGrammarChecks(pattern, MAX_CUSTOM_PATTERN_UNITS, "customPattern");
  if (pre !== null) return pre;
  // Empty pattern is legal (no tokens, empty output). Every maximal
  // letter run must be exactly one token.
  LETTER_RUN_PATTERN.lastIndex = 0;
  let match;
  while ((match = LETTER_RUN_PATTERN.exec(pattern)) !== null) {
    if (!CUSTOM_TOKENS.includes(match[0])) {
      return { error: failure("CUSTOM_FORMAT", "customPattern") };
    }
  }
  return null;
}

// Resolve a local civil time in a zone to an absolute instant.
// Returns { utcMs, ambiguous } or { error }.
//
// Method: start from the local time read as UTC, subtract the zone
// offset there, and iterate (utc = localMs - offset(utc)) until the
// value repeats — it converges at once for ordinary times and
// oscillates between two values across a DST gap. Every iterated
// value, plus one and two hours either side of each (a DST shift is
// at most two hours, and the second occurrence of an overlap is one
// shift away from the first), is a candidate; a candidate counts
// only if formatting it back in the zone reproduces the input local
// time exactly. No candidate round-trips: the local time does not
// exist (DST gap) -> NONEXISTENT_LOCAL_TIME. Two candidates
// round-trip: DST overlap -> the earlier (smaller UTC) one wins and
// ambiguousLocalTime is true.
function localToUtc(local, zone) {
  const localMs = civilToMs(local) + local.milliseconds;
  let utc = localMs - offsetMsAt(zone, localMs);
  const iterated = new Set();
  for (let step = 0; step < 6; step += 1) {
    if (iterated.has(utc)) break;
    iterated.add(utc);
    utc = localMs - offsetMsAt(zone, utc);
  }
  const candidates = new Set(iterated);
  for (const value of iterated) {
    candidates.add(value - 3600000);
    candidates.add(value + 3600000);
    candidates.add(value - 7200000);
    candidates.add(value + 7200000);
  }
  const matches = [];
  for (const candidate of candidates) {
    const parts = zoneParts(zone, candidate);
    const msPart = ((candidate % 1000) + 1000) % 1000;
    if (
      parts.year === local.year &&
      parts.month === local.month &&
      parts.day === local.day &&
      parts.hour === local.hour &&
      parts.minute === local.minute &&
      parts.second === local.second &&
      msPart === local.milliseconds
    ) {
      matches.push(candidate);
    }
  }
  matches.sort((a, b) => a - b);
  if (matches.length === 0) {
    return { error: failure("NONEXISTENT_LOCAL_TIME", "time") };
  }
  return { utcMs: matches[0], ambiguous: matches.length > 1 };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // 1. direction grammar.
  if (!DIRECTIONS.includes(raw.direction)) return failure("SCHEMA", "direction");

  let timestampMs = 0;
  let unitDetected = "milliseconds";
  let ambiguousLocalTime = false;
  let pendingLocal = null;

  if (raw.direction === "timestamp-to-datetime") {
    // 2a. timestamp: capacity, surrogate, empty, grammar.
    const pre = preGrammarChecks(raw.timestamp, MAX_TIMESTAMP_RAW_UNITS, "timestamp");
    if (pre !== null) return pre.error;
    const match = TIMESTAMP_PATTERN.exec(raw.timestamp);
    if (match === null) return failure("INTEGER_FORMAT", "timestamp");
    const negative = match[1] === "-";
    const integerPart = BigInt(match[2]);
    const fractionMs = match[3] === undefined ? null : BigInt(match[3].padEnd(3, "0"));

    // Unit handling. An invalid unit value is a step-3 SCHEMA error;
    // step 2 still reports grammar first, but detection and range
    // need a known unit, so they wait for step 3 in that case.
    const unitKnown = UNITS.includes(raw.unit);
    let unit = raw.unit;
    if (unitKnown && unit === "auto") {
      if (integerPart >= POW_12) unit = "milliseconds";
      else if (integerPart < POW_11) unit = "seconds";
      else return failure("AMBIGUOUS_UNIT", "timestamp");
    }
    if (unitKnown && unit === "milliseconds" && fractionMs !== null) {
      return failure("INTEGER_FORMAT", "timestamp");
    }
    if (unitKnown) {
      const sign = negative ? -1n : 1n;
      const msBig =
        unit === "milliseconds"
          ? sign * integerPart
          : sign * (integerPart * 1000n + (fractionMs ?? 0n));
      if (msBig < MIN_MS_BIGINT || msBig > MAX_MS_BIGINT) {
        return failure("RANGE", "timestamp");
      }
      timestampMs = Number(msBig);
      unitDetected = unit;
    }
    // When the unit is invalid, step 3 below reports SCHEMA/unit;
    // no timestampMs is needed for that path.
    if (!unitKnown) {
      // Fall through to step 3, which reports the unit error. The
      // timezone/format checks below run in their fixed order first
      // only if they precede unit in step 3 — they do not: timezone
      // is checked before unit, so check it here via the shared
      // step-3 sequence.
      if (!ZONES.includes(raw.timezone)) return failure("UNSUPPORTED_ZONE", "timezone");
      return failure("SCHEMA", "unit");
    }
  } else {
    // 2b. date, time, milliseconds, in that order.
    const datePre = preGrammarChecks(raw.date, MAX_DATE_RAW_UNITS, "date");
    if (datePre !== null) return datePre.error;
    const dateMatch = DATE_PATTERN.exec(raw.date);
    if (dateMatch === null) return failure("DATETIME_FORMAT", "date");
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
      return failure("INVALID_DATE", "date");
    }

    const timePre = preGrammarChecks(raw.time, MAX_TIME_RAW_UNITS, "time");
    if (timePre !== null) return timePre.error;
    const timeMatch = TIME_PATTERN.exec(raw.time);
    if (timeMatch === null) return failure("DATETIME_FORMAT", "time");
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    const second = Number(timeMatch[3]);
    if (hour > 23 || minute > 59) return failure("DATETIME_FORMAT", "time");
    if (second === 60) return failure("LEAP_SECOND_UNSUPPORTED", "time");
    if (second > 60) return failure("DATETIME_FORMAT", "time");

    const msPre = preGrammarChecks(raw.milliseconds, MAX_MILLISECONDS_RAW_UNITS, "milliseconds");
    if (msPre !== null) return msPre.error;
    if (!MILLISECONDS_PATTERN.test(raw.milliseconds)) {
      return failure("DATETIME_FORMAT", "milliseconds");
    }
    const milliseconds = Number(raw.milliseconds);

    // 3 (shared, below) validates timezone/unit/format/customPattern
    // before the cross-field DST resolution in step 4; the values
    // needed for step 3 are checked there. The local civil time is
    // kept for step 4.
    const local = { year, month, day, hour, minute, second, milliseconds };
    pendingLocal = local;
  }

  // 3. timezone, unit, format, customPattern (custom only when
  // format is custom). Unit was already grammar-checked in the
  // timestamp branch only when it was needed there; re-check here
  // for the datetime direction.
  if (!ZONES.includes(raw.timezone)) return failure("UNSUPPORTED_ZONE", "timezone");
  if (!UNITS.includes(raw.unit)) return failure("SCHEMA", "unit");
  if (!FORMATS.includes(raw.format)) return failure("SCHEMA", "format");
  if (raw.format === "custom") {
    const patternError = validateCustomPattern(raw.customPattern);
    if (patternError !== null) return patternError.error;
  }

  if (raw.direction === "datetime-to-timestamp") {
    // 4. Cross-field: DST gap / overlap.
    const resolved = localToUtc(pendingLocal, raw.timezone);
    if (resolved.error) return resolved.error;
    if (resolved.utcMs < MIN_MS || resolved.utcMs > MAX_MS) {
      return failure("RANGE", "date");
    }
    timestampMs = resolved.utcMs;
    ambiguousLocalTime = resolved.ambiguous;
    unitDetected = "milliseconds";
  }

  const timestampSeconds = Math.floor(timestampMs / 1000);
  return {
    ok: true,
    result: {
      direction: raw.direction,
      timestampSeconds,
      timestampMs,
      unitDetected,
      ambiguousLocalTime,
      displays: buildDisplays(timestampMs, raw.timezone, raw.format, raw.customPattern),
    },
  };
}

// Fixed report download: unix-timestamp-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, safe integers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "unix-timestamp-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("report values must be safe integers");
    }
    return String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeValue(entry)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    // Default string sort compares UTF-16 code units, as the SPEC pins.
    const keys = Object.keys(value).sort();
    const parts = keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new Error("report objects must hold plain data only");
      }
      return `${JSON.stringify(key)}:${serializeValue(descriptor.value)}`;
    });
    return `{${parts.join(",")}}`;
  }
  throw new Error("unsupported report value");
}

export function buildReport(result) {
  if (!isPlainObject(result)) {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  let text;
  try {
    text = `${serializeValue(result)}\n`;
  } catch {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, filename: REPORT_FILENAME, text, byteLength };
}
