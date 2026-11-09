// Deterministic SRT subset. All public result/error shapes follow TECHNICAL.md.
export const LIMITS = Object.freeze({ rawCodeUnits: 1048576, utf8Bytes: 1048576, cues: 2000, textLines: 10, codePoints: 1000, timestamp: 359999999 });
export const ERROR_CODES = Object.freeze([
  'ROOT_NOT_PLAIN_OBJECT', 'SYMBOL_KEY', 'UNKNOWN_FIELD', 'MISSING_FIELD',
  'ACCESSOR_PROPERTY', 'NON_ENUMERABLE_PROPERTY', 'SRT_RAW_TYPE',
  'RAW_CODE_UNITS_HIGH', 'NUL_NOT_ALLOWED', 'UNPAIRED_SURROGATE', 'UTF8_BYTES_HIGH',
  'DIRECTION_INVALID', 'SECONDS_TYPE', 'SECONDS_FORMAT', 'SECONDS_RANGE',
  'NO_CUES', 'CUE_COUNT_HIGH', 'INDEX_FORMAT', 'INDEX_RANGE', 'INDEX_NOT_INCREASING',
  'TIMING_LINE_MISSING', 'TIMING_FORMAT', 'TIMESTAMP_RANGE', 'CUE_START_NOT_BEFORE_END',
  'CUE_TEXT_MISSING', 'CUE_TEXT_LINES_HIGH', 'CUE_TEXT_LINE_TOO_LONG',
  'MISSING_CUE_SEPARATOR', 'SHIFT_OUT_OF_BOUNDS'
]);
const FIELDS = Object.freeze(['srtRaw', 'direction', 'secondsRaw']);
// A negative any-character lookahead is an absolute end. JavaScript `$` alone
// also matches before a final Unicode line terminator, outside this subset.
const TIMING = /^([0-9]{2}):([0-9]{2}):([0-9]{2}),([0-9]{3})[ \t]+-->[ \t]+([0-9]{2}):([0-9]{2}):([0-9]{2}),([0-9]{3})(?![\s\S])/;
const INDEX = /^[0-9]{1,6}(?![\s\S])/;
const separator = line => /^[ \t]*(?![\s\S])/.test(line);
const fail = (code, field = 'srtRaw', line = null, cueIndex = null) => ({ ok: false, error: { code, field, line, cueIndex } });

export function parseSecondsToMs(secondsRaw) {
  if (typeof secondsRaw !== 'string') return fail('SECONDS_TYPE', 'secondsRaw');
  if (!/^[0-9]{1,4}(?:\.[0-9]{1,3})?(?![\s\S])/.test(secondsRaw)) return fail('SECONDS_FORMAT', 'secondsRaw');
  const [whole, fraction = ''] = secondsRaw.split('.');
  const value = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  return value > 3600000 ? fail('SECONDS_RANGE', 'secondsRaw') : { ok: true, value };
}

export function validateShiftInput(input) {
  if (input === null || typeof input !== 'object' || Object.getPrototypeOf(input) !== Object.prototype) return fail('ROOT_NOT_PLAIN_OBJECT', 'input');
  const keys = Reflect.ownKeys(input);
  if (keys.some(key => typeof key === 'symbol')) return fail('SYMBOL_KEY', 'input');
  if (keys.some(key => !FIELDS.includes(key))) return fail('UNKNOWN_FIELD', 'input');
  for (const key of FIELDS) if (!Object.hasOwn(input, key)) return fail('MISSING_FIELD', 'input');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  for (const key of FIELDS) {
    const descriptor = descriptors[key];
    if (!Object.hasOwn(descriptor, 'value')) return fail('ACCESSOR_PROPERTY', 'input');
    if (!descriptor.enumerable) return fail('NON_ENUMERABLE_PROPERTY', 'input');
  }
  const srtRaw = descriptors.srtRaw.value;
  if (typeof srtRaw !== 'string') return fail('SRT_RAW_TYPE');
  if (srtRaw.length > LIMITS.rawCodeUnits) return fail('RAW_CODE_UNITS_HIGH');
  for (let i = 0; i < srtRaw.length; i++) {
    const code = srtRaw.charCodeAt(i);
    if (code === 0) return fail('NUL_NOT_ALLOWED');
    if (code >= 0xd800 && code <= 0xdbff) {
      const low = srtRaw.charCodeAt(i + 1);
      if (!(low >= 0xdc00 && low <= 0xdfff)) return fail('UNPAIRED_SURROGATE');
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) return fail('UNPAIRED_SURROGATE');
  }
  const inputUtf8Bytes = new TextEncoder().encode(srtRaw).byteLength;
  if (inputUtf8Bytes > LIMITS.utf8Bytes) return fail('UTF8_BYTES_HIGH');
  const direction = descriptors.direction.value;
  if (direction !== 'earlier' && direction !== 'later') return fail('DIRECTION_INVALID', 'direction');
  const secondsRaw = descriptors.secondsRaw.value;
  const parsed = parseSecondsToMs(secondsRaw);
  if (!parsed.ok) return parsed;
  return { ok: true, value: { srtRaw, direction, secondsRaw, shiftMilliseconds: parsed.value, inputUtf8Bytes } };
}

export function parseSrt(srtRaw, inputUtf8Bytes) {
  const normalized = (srtRaw.startsWith('\uFEFF') ? srtRaw.slice(1) : srtRaw).replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const cues = [];
  let position = 0;
  let previousIndex = 0;
  while (position < lines.length) {
    if (separator(lines[position])) { position++; continue; }
    const cueOrdinal = cues.length + 1;
    if (cues.length === LIMITS.cues) return fail('CUE_COUNT_HIGH', 'srtRaw', position + 1, cueOrdinal);
    const indexRaw = lines[position];
    if (!INDEX.test(indexRaw)) return fail('INDEX_FORMAT', 'srtRaw', position + 1, cueOrdinal);
    const indexValue = Number(indexRaw);
    if (indexValue < 1) return fail('INDEX_RANGE', 'srtRaw', position + 1, cueOrdinal);
    if (indexValue <= previousIndex) return fail('INDEX_NOT_INCREASING', 'srtRaw', position + 1, cueOrdinal);
    position++;
    const timingLine = position + 1;
    if (position === lines.length || separator(lines[position])) return fail('TIMING_LINE_MISSING', 'srtRaw', timingLine, cueOrdinal);
    const match = TIMING.exec(lines[position]);
    if (!match) return fail('TIMING_FORMAT', 'srtRaw', timingLine, cueOrdinal);
    const components = match.slice(1).map(Number);
    for (const offset of [0, 4]) {
      if (components[offset] > 99 || components[offset + 1] > 59 || components[offset + 2] > 59) return fail('TIMESTAMP_RANGE', 'srtRaw', timingLine, cueOrdinal);
    }
    const toMs = offset => components[offset] * 3600000 + components[offset + 1] * 60000 + components[offset + 2] * 1000 + components[offset + 3];
    const originalStartMs = toMs(0);
    const originalEndMs = toMs(4);
    if (originalStartMs >= originalEndMs) return fail('CUE_START_NOT_BEFORE_END', 'srtRaw', timingLine, cueOrdinal);
    position++;
    const textLines = [];
    while (position < lines.length && !separator(lines[position])) {
      const line = lines[position];
      if (INDEX.test(line) && position + 1 < lines.length && TIMING.test(lines[position + 1])) return fail('MISSING_CUE_SEPARATOR', 'srtRaw', position + 1, cueOrdinal + 1);
      if (textLines.length === LIMITS.textLines) return fail('CUE_TEXT_LINES_HIGH', 'srtRaw', position + 1, cueOrdinal);
      let count = 0;
      for (const point of line) { void point; if (++count > LIMITS.codePoints) return fail('CUE_TEXT_LINE_TOO_LONG', 'srtRaw', position + 1, cueOrdinal); }
      textLines.push(line);
      position++;
    }
    if (textLines.length === 0) return fail('CUE_TEXT_MISSING', 'srtRaw', position + 1, cueOrdinal);
    cues.push({ cueOrdinal, indexRaw, indexValue, originalStartMs, originalEndMs, timingLine, textLines });
    previousIndex = indexValue;
  }
  return cues.length ? { ok: true, value: { cues, inputUtf8Bytes } } : fail('NO_CUES');
}

export function shiftCues(cues, direction, shiftMilliseconds) {
  const delta = direction === 'earlier' ? -shiftMilliseconds : shiftMilliseconds;
  const value = [];
  for (const cue of cues) {
    const shiftedStartMs = cue.originalStartMs + delta;
    const shiftedEndMs = cue.originalEndMs + delta;
    for (const endpoint of [shiftedStartMs, shiftedEndMs]) {
      if (endpoint < 0 || endpoint > LIMITS.timestamp) return fail('SHIFT_OUT_OF_BOUNDS', 'srtRaw', cue.timingLine, cue.cueOrdinal);
    }
    value.push({ cueOrdinal: cue.cueOrdinal, indexRaw: cue.indexRaw, originalStartMs: cue.originalStartMs, originalEndMs: cue.originalEndMs, shiftedStartMs, shiftedEndMs, textLines: [...cue.textLines] });
  }
  return { ok: true, value };
}

export function formatTimestamp(milliseconds) {
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor(milliseconds / 60000) % 60;
  const seconds = Math.floor(milliseconds / 1000) % 60;
  const ms = milliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function formatSrt(cues) {
  return cues.map(cue => `${cue.indexRaw}\n${formatTimestamp(cue.shiftedStartMs)} --> ${formatTimestamp(cue.shiftedEndMs)}\n${cue.textLines.join('\n')}`).join('\n\n') + '\n';
}

export function analyzeAndShiftSrt(input) {
  const validation = validateShiftInput(input);
  if (!validation.ok) return validation;
  const { srtRaw, direction, secondsRaw, shiftMilliseconds, inputUtf8Bytes } = validation.value;
  const parsed = parseSrt(srtRaw, inputUtf8Bytes);
  if (!parsed.ok) return parsed;
  const shifted = shiftCues(parsed.value.cues, direction, shiftMilliseconds);
  if (!shifted.ok) return shifted;
  const cues = shifted.value;
  const srtText = formatSrt(cues);
  const summary = (cue, prefix) => ({ cueOrdinal: cue.cueOrdinal, indexRaw: cue.indexRaw, start: formatTimestamp(cue[`${prefix}StartMs`]), end: formatTimestamp(cue[`${prefix}EndMs`]) });
  return { ok: true, result: {
    direction, secondsRaw, shiftMilliseconds, cueCount: cues.length, inputUtf8Bytes,
    outputUtf8Bytes: new TextEncoder().encode(srtText).byteLength,
    firstInputCue: summary(cues[0], 'original'), lastInputCue: summary(cues.at(-1), 'original'),
    firstOutputCue: summary(cues[0], 'shifted'), lastOutputCue: summary(cues.at(-1), 'shifted'),
    cues, srtText
  } };
}
