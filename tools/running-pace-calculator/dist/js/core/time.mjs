// Time grammar, rounding and formatting (SPEC section 4).
// One grammar is shared by the time field and the pace field:
//   (i)   digits only          -> total seconds
//   (ii)  M:SS                 -> one or more digits, colon, exactly two digits 00-59
//   (iii) H:MM:SS              -> one or more digits, then two components of
//                                 exactly two digits each, 00-59
// Anything else is malformed. A two-digit component above 59 in an otherwise
// well-shaped text is reported separately so the error can name it.

const ASCII_WS_AT_EDGES = /^[\t\n\v\f\r ]+|[\t\n\v\f\r ]+$/g;

export function trimAsciiWhitespace(text) {
  return String(text).replace(ASCII_WS_AT_EDGES, '');
}

/** Round to the nearest integer, halves away from zero (SPEC section 4). */
export function roundHalfAwayFromZero(value) {
  return Math.sign(value) * Math.floor(Math.abs(value) + 0.5);
}

/** Round to a fixed number of decimal places, halves away from zero. */
export function roundTo(value, places) {
  const factor = 10 ** places;
  return roundHalfAwayFromZero(value * factor) / factor;
}

/**
 * Parse time text per the SPEC grammar.
 * Returns { ok: true, seconds } or
 * { ok: false, code: 'empty' | 'malformed' } or
 * { ok: false, code: 'component', component: '<the two digits above 59>' }.
 */
export function parseTimeText(input) {
  const text = trimAsciiWhitespace(input);
  if (text === '') return { ok: false, code: 'empty' };
  if (/^\d+$/.test(text)) return { ok: true, seconds: Number(text) };

  let match = /^(\d+):(\d{2})$/.exec(text);
  if (match) {
    if (Number(match[2]) > 59) {
      return { ok: false, code: 'component', component: match[2] };
    }
    return { ok: true, seconds: Number(match[1]) * 60 + Number(match[2]) };
  }

  match = /^(\d+):(\d{2}):(\d{2})$/.exec(text);
  if (match) {
    if (Number(match[2]) > 59) {
      return { ok: false, code: 'component', component: match[2] };
    }
    if (Number(match[3]) > 59) {
      return { ok: false, code: 'component', component: match[3] };
    }
    return {
      ok: true,
      seconds: Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]),
    };
  }

  return { ok: false, code: 'malformed' };
}

/**
 * Display format (SPEC section 4): under one hour "M:SS" (minutes not
 * zero-padded, seconds zero-padded); one hour or more "H:MM:SS".
 * The value is rounded to whole seconds, half away from zero, first.
 */
export function formatTime(seconds) {
  const total = roundHalfAwayFromZero(seconds);
  const absolute = Math.abs(total);
  const hours = Math.floor(absolute / 3600);
  const minutes = Math.floor((absolute % 3600) / 60);
  const secs = absolute % 60;
  const ss = String(secs).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  return `${minutes}:${ss}`;
}

/** Fixed-decimal display, e.g. a solved distance "35.00". */
export function formatFixed(value, places) {
  return roundTo(value, places).toFixed(places);
}

/** Decimal display with trailing zeros stripped, e.g. 10.50 -> "10.5". */
export function formatTrimmed(value, places) {
  let text = roundTo(value, places).toFixed(places);
  if (text.includes('.')) {
    text = text.replace(/0+$/, '').replace(/\.$/, '');
  }
  return text;
}
