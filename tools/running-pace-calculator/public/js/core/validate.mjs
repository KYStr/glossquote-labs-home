// Per-field validation of typed inputs (SPEC sections 2 and 3).
// The bounds bind typed inputs only; computed results are displayed as
// computed even when they fall outside these bounds.

import {
  DISTANCE_MAX,
  DISTANCE_MIN,
  PACE_MAX_SECONDS,
  PACE_MIN_SECONDS,
  TIME_MAX_SECONDS,
  TIME_MIN_SECONDS,
} from './constants.mjs';
import { parseTimeText, trimAsciiWhitespace } from './time.mjs';
import { unitFactor } from './units.mjs';

/** Total-time field: 1 second to 99:59:59. */
export function parseTimeField(text) {
  const parsed = parseTimeText(text);
  if (!parsed.ok) return parsed;
  if (parsed.seconds < TIME_MIN_SECONDS) return { ok: false, code: 'too-small' };
  if (parsed.seconds > TIME_MAX_SECONDS) return { ok: false, code: 'too-large' };
  return { ok: true, seconds: parsed.seconds };
}

/** Pace field: 0:30 to 59:59 per chosen unit; zero is its own error. */
export function parsePaceField(text, unit) {
  const parsed = parseTimeText(text);
  if (!parsed.ok) return parsed;
  if (parsed.seconds === 0) return { ok: false, code: 'zero' };
  if (parsed.seconds < PACE_MIN_SECONDS) return { ok: false, code: 'too-small' };
  if (parsed.seconds > PACE_MAX_SECONDS) return { ok: false, code: 'too-large' };
  return {
    ok: true,
    secondsPerUnit: parsed.seconds,
    secondsPerKm: parsed.seconds / unitFactor(unit),
  };
}

/** Distance field: a plain decimal in the chosen unit, 0.01 to 300. */
export function parseDistanceField(text, unit) {
  const trimmed = trimAsciiWhitespace(text);
  if (trimmed === '') return { ok: false, code: 'empty' };
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(trimmed)) {
    return { ok: false, code: 'malformed' };
  }
  const value = Number(trimmed);
  if (!(value >= DISTANCE_MIN)) return { ok: false, code: 'too-small' };
  if (value > DISTANCE_MAX) return { ok: false, code: 'too-large' };
  return { ok: true, value, km: value * unitFactor(unit) };
}
