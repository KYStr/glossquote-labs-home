// Pure core for the Trip Time Estimator.
//
// Fixed contract: spec-trip-time-estimator-20261109 (spec candidate
// 8d2f3ec18de2885916da813361e4d19a68eac3da). Everything here is
// deterministic: the computation runs on absolute minutes since the
// civil epoch day with Hinnant's civil conversions and explicit UTC
// offsets only. The core never reads a clock, a calendar service, a
// time-zone database, the network, storage, or the DOM.

export const FIELDS = [
  "mode",
  "departureDate",
  "departureTime",
  "departureOffset",
  "arrivalOffset",
  "duration",
  "arrivalTime",
  "arrivalNextDay",
];

export const FIELD_LIMITS = {
  mode: 16,
  departureDate: 16,
  departureTime: 8,
  departureOffset: 8,
  arrivalOffset: 8,
  duration: 8,
  arrivalTime: 8,
  arrivalNextDay: 8,
};

export const DEFAULTS = {
  mode: "duration",
  departureDate: "",
  departureTime: "",
  departureOffset: "+08:00",
  arrivalOffset: "+09:00",
  duration: "",
  arrivalTime: "",
  arrivalNextDay: "",
};

export const EXAMPLE = {
  mode: "duration",
  departureDate: "2026-04-08",
  departureTime: "08:00",
  departureOffset: "+08:00",
  arrivalOffset: "+09:00",
  duration: "3:05",
  arrivalTime: "",
  arrivalNextDay: "",
};

export const REPORT_FILENAME = "trip-time-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

// ---------------------------------------------------------------------------
// Small helpers

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasUnpairedSurrogate(text) {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Reads one field as an own data property. Accessors are never invoked:
// a non-data descriptor (or a missing key) yields undefined here and the
// caller reports SCHEMA.
function readRawInput(source, field) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(source, field);
  if (descriptor === undefined || !("value" in descriptor)) return undefined;
  return descriptor.value;
}

function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const snapshot = {};
  for (const field of FIELDS) {
    const value = readRawInput(input, field);
    if (typeof value !== "string") return null;
    snapshot[field] = value;
  }
  return snapshot;
}

// Per-field prelude, in the SPEC's order: capacity, then unpaired
// surrogate, then emptiness. Returns an error object or null.
function checkPrelude(field, value) {
  if (value.length > FIELD_LIMITS[field]) return failure("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(value)) return failure("UNICODE", field);
  if (value === "") return failure("EMPTY", field);
  return null;
}

// ---------------------------------------------------------------------------
// Civil conversions (Hinnant), integer arithmetic with floor division.

function floorDiv(a, b) {
  return Math.floor(a / b);
}

export function daysFromCivil(year, month, day) {
  const y = month <= 2 ? year - 1 : year;
  const era = floorDiv(y, 400);
  const yoe = y - era * 400;
  const mp = month > 2 ? month - 3 : month + 9;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function civilFromDays(z) {
  const zz = z + 719468;
  const era = floorDiv(zz, 146097);
  const doe = zz - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const yy = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: month <= 2 ? yy + 1 : yy, month, day };
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(year, month) {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

// ---------------------------------------------------------------------------
// Field grammars. Each returns { value } or { error } (prelude already ran).

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const OFFSET_PATTERN = /^[+-]\d{2}:\d{2}$/;
const DURATION_PATTERN = /^(0|[1-9]\d{0,2}):[0-5]\d$/;

function parseDepartureDate(text) {
  if (!DATE_PATTERN.test(text)) return { error: failure("DATE_FORMAT", "departureDate") };
  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(5, 7));
  const day = Number(text.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { error: failure("DATE_INVALID", "departureDate") };
  }
  const stamp = year * 10000 + month * 100 + day;
  if (stamp < 20000101 || stamp > 20991231) {
    return { error: failure("RANGE", "departureDate") };
  }
  return { value: { year, month, day } };
}

function parseClockTime(text, field) {
  if (!TIME_PATTERN.test(text)) return { error: failure("TIME_FORMAT", field) };
  const hour = Number(text.slice(0, 2));
  const minute = Number(text.slice(3, 5));
  if (hour > 23 || minute > 59) return { error: failure("RANGE", field) };
  return { value: hour * 60 + minute };
}

const OFFSET_STEPS = new Set([0, 15, 30, 45]);

function parseOffset(text, field) {
  if (!OFFSET_PATTERN.test(text)) return { error: failure("OFFSET_FORMAT", field) };
  const minutePart = Number(text.slice(4, 6));
  if (!OFFSET_STEPS.has(minutePart)) return { error: failure("OFFSET_FORMAT", field) };
  if (text === "-00:00") return { error: failure("OFFSET_FORMAT", field) };
  const magnitude = Number(text.slice(1, 3)) * 60 + minutePart;
  const minutes = text[0] === "-" ? -magnitude : magnitude;
  if (minutes < -720 || minutes > 840) return { error: failure("RANGE", field) };
  return { value: minutes };
}

function parseDuration(text) {
  if (!DURATION_PATTERN.test(text)) return { error: failure("DURATION_FORMAT", "duration") };
  const colon = text.indexOf(":");
  const total = Number(text.slice(0, colon)) * 60 + Number(text.slice(colon + 1));
  if (total < 1 || total > 2880) return { error: failure("RANGE", "duration") };
  return { value: total };
}

// ---------------------------------------------------------------------------
// Absolute-minutes model.

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDay(dayNumber) {
  const { year, month, day } = civilFromDays(dayNumber);
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

// Reading of an absolute minute at a fixed offset, relative to the
// departure day. dayShift is provably in -2..+4 for legal inputs.
function readingAt(instant, offsetMinutes, offsetText, departureDay) {
  const local = instant + offsetMinutes;
  const day = floorDiv(local, 1440);
  const remainder = local - day * 1440;
  return {
    date: formatDay(day),
    time: `${pad2(Math.floor(remainder / 60))}:${pad2(remainder % 60)}`,
    offset: offsetText,
    dayShift: day - departureDay,
  };
}

function formatDuration(totalMinutes) {
  return `${Math.floor(totalMinutes / 60)}:${pad2(totalMinutes % 60)}`;
}

// ---------------------------------------------------------------------------
// run: validate a raw string snapshot and compute the trip readings.

export function run(input) {
  const snapshot = readSchema(input);
  if (snapshot === null) return failure("SCHEMA", null);

  // The mode is validated first: it decides which fields belong to the
  // request at all.
  const modePrelude = checkPrelude("mode", snapshot.mode);
  if (modePrelude !== null) return modePrelude;
  if (snapshot.mode !== "duration" && snapshot.mode !== "arrival") {
    return failure("ENUM", "mode");
  }
  const mode = snapshot.mode;

  // Mode exclusivity is a shape rule, decided before field validation:
  // fields of the other mode must be exactly empty.
  if (mode === "duration" && (snapshot.arrivalTime !== "" || snapshot.arrivalNextDay !== "")) {
    return failure("SCHEMA", null);
  }
  if (mode === "arrival" && snapshot.duration !== "") {
    return failure("SCHEMA", null);
  }

  // Common fields, in the SPEC's order.
  const datePrelude = checkPrelude("departureDate", snapshot.departureDate);
  if (datePrelude !== null) return datePrelude;
  const parsedDate = parseDepartureDate(snapshot.departureDate);
  if (parsedDate.error) return parsedDate.error;

  const depTimePrelude = checkPrelude("departureTime", snapshot.departureTime);
  if (depTimePrelude !== null) return depTimePrelude;
  const parsedDepTime = parseClockTime(snapshot.departureTime, "departureTime");
  if (parsedDepTime.error) return parsedDepTime.error;

  const depOffsetPrelude = checkPrelude("departureOffset", snapshot.departureOffset);
  if (depOffsetPrelude !== null) return depOffsetPrelude;
  const parsedDepOffset = parseOffset(snapshot.departureOffset, "departureOffset");
  if (parsedDepOffset.error) return parsedDepOffset.error;

  const arrOffsetPrelude = checkPrelude("arrivalOffset", snapshot.arrivalOffset);
  if (arrOffsetPrelude !== null) return arrOffsetPrelude;
  const parsedArrOffset = parseOffset(snapshot.arrivalOffset, "arrivalOffset");
  if (parsedArrOffset.error) return parsedArrOffset.error;

  const departureDay = daysFromCivil(parsedDate.value.year, parsedDate.value.month, parsedDate.value.day);
  const departureInstant = departureDay * 1440 + parsedDepTime.value - parsedDepOffset.value;

  let arrivalInstant;
  let durationMinutes;
  if (mode === "duration") {
    const durationPrelude = checkPrelude("duration", snapshot.duration);
    if (durationPrelude !== null) return durationPrelude;
    const parsedDuration = parseDuration(snapshot.duration);
    if (parsedDuration.error) return parsedDuration.error;
    durationMinutes = parsedDuration.value;
    arrivalInstant = departureInstant + durationMinutes;
  } else {
    const arrTimePrelude = checkPrelude("arrivalTime", snapshot.arrivalTime);
    if (arrTimePrelude !== null) return arrTimePrelude;
    const parsedArrTime = parseClockTime(snapshot.arrivalTime, "arrivalTime");
    if (parsedArrTime.error) return parsedArrTime.error;

    const nextDayPrelude = checkPrelude("arrivalNextDay", snapshot.arrivalNextDay);
    if (nextDayPrelude !== null) return nextDayPrelude;
    if (snapshot.arrivalNextDay !== "true" && snapshot.arrivalNextDay !== "false") {
      return failure("ENUM", "arrivalNextDay");
    }

    const arrivalLocalAbsolute =
      (departureDay + (snapshot.arrivalNextDay === "true" ? 1 : 0)) * 1440 + parsedArrTime.value;
    arrivalInstant = arrivalLocalAbsolute - parsedArrOffset.value;
    durationMinutes = arrivalInstant - departureInstant;
    if (durationMinutes <= 0) return failure("DURATION_NOT_POSITIVE", "arrivalTime");
    if (durationMinutes > 2880) return failure("RANGE", "arrivalTime");
  }

  const result = {
    mode,
    durationMinutes,
    duration: formatDuration(durationMinutes),
    departureLocal: {
      date: snapshot.departureDate,
      time: snapshot.departureTime,
      offset: snapshot.departureOffset,
    },
    departureInArrivalZone: readingAt(
      departureInstant,
      parsedArrOffset.value,
      snapshot.arrivalOffset,
      departureDay,
    ),
    arrivalLocal: readingAt(arrivalInstant, parsedArrOffset.value, snapshot.arrivalOffset, departureDay),
    arrivalInDepartureZone: readingAt(
      arrivalInstant,
      parsedDepOffset.value,
      snapshot.departureOffset,
      departureDay,
    ),
  };
  return { ok: true, result };
}

// ---------------------------------------------------------------------------
// Canonical report serialization: compact JSON, object keys sorted
// ascending by UTF-16 code units recursively, array order unchanged,
// exactly one trailing LF. Built from primitives only — an input
// toJSON is never invoked.

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite number in report");
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeValue(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const parts = keys.map((key) => `${JSON.stringify(key)}:${serializeValue(value[key])}`);
    return `{${parts.join(",")}}`;
  }
  throw new TypeError("unsupported value in report");
}

export function serializeReport(result) {
  return `${serializeValue(result)}\n`;
}
