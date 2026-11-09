// Pure civil-time conversion core for the Time Zone Converter.
// Implements SPEC section 4 exactly: the source reading is resolved to one
// UTC instant under the pinned gap/overlap rules, and every target row is
// derived from that single instant through the platform Intl time-zone
// database. Gap/overlap detection is by round-tripping (SPEC section 4);
// no transition dates are hardcoded anywhere in this module.
//
// This module has no DOM, network or storage access and never consults the
// host's local time zone: every computation goes through Intl with an
// explicit timeZone, or through Date.UTC arithmetic.

import { ZONES, isKnownZone } from "./zones.mjs";

export { ZONES, isKnownZone };

export const MIN_DATE = "2000-01-01";
export const MAX_DATE = "2099-12-31";
export const MAX_TARGETS = 20;

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isRealCalendarDate(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

// Returns { ok: true, value: "YYYY-MM-DD" } or { ok: false, error } where
// error is "invalid-date" (malformed or not a real calendar date) or
// "date-out-of-range" (a real date outside 2000-01-01..2099-12-31).
export function validateDate(value) {
  if (typeof value !== "string") return { ok: false, error: "invalid-date" };
  const match = DATE_PATTERN.exec(value);
  if (!match) return { ok: false, error: "invalid-date" };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isRealCalendarDate(year, month, day)) {
    return { ok: false, error: "invalid-date" };
  }
  if (value < MIN_DATE || value > MAX_DATE) {
    return { ok: false, error: "date-out-of-range" };
  }
  return { ok: true, value };
}

// Returns { ok: true, value: "HH:MM" } or { ok: false, error: "invalid-time" }.
export function validateTime(value) {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) {
    return { ok: false, error: "invalid-time" };
  }
  return { ok: true, value };
}

// Validates a target list: every entry a known zone, no duplicates, at most
// MAX_TARGETS entries. An empty list is valid (the UI shows its prompt).
// Returns { ok: true, value: [...] } or { ok: false, error, zone? } where
// error is "unknown-zone", "duplicate-target" or "too-many-targets".
export function validateTargets(targets) {
  if (!Array.isArray(targets)) return { ok: false, error: "invalid-targets" };
  const seen = new Set();
  for (const zone of targets) {
    if (!isKnownZone(zone)) return { ok: false, error: "unknown-zone", zone };
    if (seen.has(zone)) return { ok: false, error: "duplicate-target", zone };
    seen.add(zone);
  }
  if (targets.length > MAX_TARGETS) {
    return { ok: false, error: "too-many-targets" };
  }
  return { ok: true, value: [...targets] };
}

// Decides whether one more target may be added. Returns
// { ok: true } or { ok: false, error: "unknown-zone" | "duplicate-target" |
// "too-many-targets", zone }.
export function checkAddTarget(targets, zone) {
  if (!isKnownZone(zone)) return { ok: false, error: "unknown-zone", zone };
  if (targets.includes(zone)) {
    return { ok: false, error: "duplicate-target", zone };
  }
  if (targets.length >= MAX_TARGETS) {
    return { ok: false, error: "too-many-targets", zone };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Intl plumbing (explicit zone everywhere; formatters cached per zone)
// ---------------------------------------------------------------------------

const formatterCache = new Map();

function formatterFor(zone) {
  let formatter = formatterCache.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(zone, formatter);
  }
  return formatter;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function formatDateParts(year, month, day) {
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

// Wall-clock fields of an instant read in a zone.
export function wallPartsAt(zone, instantMs) {
  const fields = {};
  for (const part of formatterFor(zone).formatToParts(new Date(instantMs))) {
    if (part.type !== "literal") fields[part.type] = part.value;
  }
  return {
    year: Number(fields.year),
    month: Number(fields.month),
    day: Number(fields.day),
    hour: Number(fields.hour) % 24,
    minute: Number(fields.minute),
    second: Number(fields.second),
  };
}

// The zone's UTC offset at an instant, in minutes (east of UTC positive).
export function offsetMinutesAt(zone, instantMs) {
  const wall = wallPartsAt(zone, instantMs);
  const wallAsUtcMs = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  );
  const instantSecondMs = Math.floor(instantMs / 1000) * 1000;
  return Math.round((wallAsUtcMs - instantSecondMs) / MINUTE_MS);
}

// SPEC section 4: sign + two-digit hours + ':' + two-digit minutes,
// e.g. +05:45, -05:00, +00:00. Never "Z", never an abbreviation.
export function formatOffset(offsetMinutes) {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  return `${sign}${pad2(Math.floor(absolute / 60))}:${pad2(absolute % 60)}`;
}

// Full reading of an instant in a zone: { date, time, offsetMinutes, offset }.
export function readingAt(zone, instantMs) {
  const wall = wallPartsAt(zone, instantMs);
  const offsetMinutes = offsetMinutesAt(zone, instantMs);
  return {
    date: formatDateParts(wall.year, wall.month, wall.day),
    time: `${pad2(wall.hour)}:${pad2(wall.minute)}`,
    offsetMinutes,
    offset: formatOffset(offsetMinutes),
  };
}

// The displayed UTC instant, e.g. { date: "2026-01-15", time: "01:00" }.
export function utcReadingAt(instantMs) {
  const instant = new Date(instantMs);
  return {
    date: formatDateParts(
      instant.getUTCFullYear(),
      instant.getUTCMonth() + 1,
      instant.getUTCDate(),
    ),
    time: `${pad2(instant.getUTCHours())}:${pad2(instant.getUTCMinutes())}`,
  };
}

// ---------------------------------------------------------------------------
// Resolution of a source reading to a UTC instant (SPEC section 4)
// ---------------------------------------------------------------------------

function readingToMs(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute);
}

// Every instant whose wall reading in the zone equals the entered reading.
// Candidates come from the distinct offsets in effect around the reading;
// each candidate is accepted only if it round-trips to the entered reading.
function occurrenceInstants(zone, readingMs) {
  const sampleInstants = [
    readingMs - 48 * HOUR_MS,
    readingMs - 12 * HOUR_MS,
    readingMs,
    readingMs + 12 * HOUR_MS,
    readingMs + 48 * HOUR_MS,
  ];
  const offsets = new Set(sampleInstants.map((t) => offsetMinutesAt(zone, t)));
  const occurrences = [];
  for (const offset of offsets) {
    const candidate = readingMs - offset * MINUTE_MS;
    const wall = wallPartsAt(zone, candidate);
    const candidateReadingMs = Date.UTC(
      wall.year,
      wall.month - 1,
      wall.day,
      wall.hour,
      wall.minute,
    );
    if (candidateReadingMs === readingMs) occurrences.push(candidate);
  }
  occurrences.sort((a, b) => a - b);
  return { occurrences, candidateOffsets: [...offsets] };
}

// Resolves (date, time, zone) to one UTC instant under the SPEC rules:
// ordinary -> the unique instant; overlap -> the EARLIER occurrence;
// gap -> the reading shifted forward by the jump, read under the
// post-transition offset (equivalently, read under the offset in effect
// immediately before the transition).
// Returns { ok: true, instantMs, kind, resolvedReading, jumpMinutes? } or
// { ok: false, error }.
export function resolveSource(input) {
  const dateCheck = validateDate(input?.date);
  if (!dateCheck.ok) return { ok: false, error: dateCheck.error };
  const timeCheck = validateTime(input?.time);
  if (!timeCheck.ok) return { ok: false, error: timeCheck.error };
  if (!isKnownZone(input?.zone)) return { ok: false, error: "unknown-zone" };

  const zone = input.zone;
  const readingMs = readingToMs(dateCheck.value, timeCheck.value);
  const { occurrences, candidateOffsets } = occurrenceInstants(zone, readingMs);

  if (occurrences.length >= 2) {
    const instantMs = occurrences[0];
    return {
      ok: true,
      instantMs,
      kind: "overlap",
      resolvedReading: readingAt(zone, instantMs),
    };
  }
  if (occurrences.length === 1) {
    const instantMs = occurrences[0];
    return {
      ok: true,
      instantMs,
      kind: "ordinary",
      resolvedReading: readingAt(zone, instantMs),
    };
  }

  // Gap: the reading never occurs. The offset in effect immediately before
  // the transition is the one in effect just before the earliest candidate
  // instant; reading under it lands exactly (entered + jump) past the jump.
  const earliestCandidate = Math.min(
    ...candidateOffsets.map((offset) => readingMs - offset * MINUTE_MS),
  );
  const preTransitionOffset = offsetMinutesAt(zone, earliestCandidate - MINUTE_MS);
  const instantMs = readingMs - preTransitionOffset * MINUTE_MS;
  const resolvedReading = readingAt(zone, instantMs);
  const jumpMinutes = resolvedReading.offsetMinutes - preTransitionOffset;
  return { ok: true, instantMs, kind: "gap", resolvedReading, jumpMinutes };
}

// ---------------------------------------------------------------------------
// Full conversion: resolve once, derive every row from the single instant
// ---------------------------------------------------------------------------

function dayShiftBetween(sourceDate, targetDate) {
  const [sy, sm, sd] = sourceDate.split("-").map(Number);
  const [ty, tm, td] = targetDate.split("-").map(Number);
  const diffMs = Date.UTC(ty, tm - 1, td) - Date.UTC(sy, sm - 1, sd);
  return Math.round(diffMs / 86_400_000);
}

// convert({ date, time, zone, targets }) ->
// { ok: true, instantMs, utc: { date, time }, kind, resolvedReading,
//   jumpMinutes?, rows: [{ zone, date, time, offsetMinutes, offset,
//   dayShift }] }
// or { ok: false, error, zone? } (date/time errors take precedence, in the
// order date, time, source zone, targets).
export function convert(input) {
  const resolved = resolveSource(input);
  if (!resolved.ok) return resolved;
  const targetsCheck = validateTargets(input?.targets ?? []);
  if (!targetsCheck.ok) return targetsCheck;

  const rows = targetsCheck.value.map((zone) => {
    const reading = readingAt(zone, resolved.instantMs);
    return {
      zone,
      date: reading.date,
      time: reading.time,
      offsetMinutes: reading.offsetMinutes,
      offset: reading.offset,
      // Day shift compares against the ENTERED source date (SPEC section 4).
      dayShift: dayShiftBetween(input.date, reading.date),
    };
  });

  return {
    ok: true,
    instantMs: resolved.instantMs,
    utc: utcReadingAt(resolved.instantMs),
    kind: resolved.kind,
    resolvedReading: resolved.resolvedReading,
    ...(resolved.kind === "gap" ? { jumpMinutes: resolved.jumpMinutes } : {}),
    rows,
  };
}
