import { ERROR_CODES, LIMITS, parseSecondsToMs, formatTimestamp } from './core.mjs';

// Only inspect plain data records. Browser messages arrive by structured clone.
export function exactRecord(value, names) {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== names.length || keys.some(key => typeof key !== 'string' || !names.includes(key))) return false;
  return keys.every(key => { const d = Object.getOwnPropertyDescriptor(value, key); return d.enumerable && Object.hasOwn(d, 'value'); });
}
const integer = (value, min, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;
const tokensValid = record => integer(record.jobId, 1) && integer(record.revision, 0) && integer(record.pageGeneration, 0);
export function isShiftRequest(value) {
  return exactRecord(value, ['type', 'jobId', 'revision', 'pageGeneration', 'input']) && value.type === 'shift' && tokensValid(value);
}
const SCALAR_ERROR_FIELDS = Object.freeze({
  ROOT_NOT_PLAIN_OBJECT: 'input', SYMBOL_KEY: 'input', UNKNOWN_FIELD: 'input', MISSING_FIELD: 'input',
  ACCESSOR_PROPERTY: 'input', NON_ENUMERABLE_PROPERTY: 'input',
  SRT_RAW_TYPE: 'srtRaw', RAW_CODE_UNITS_HIGH: 'srtRaw', NUL_NOT_ALLOWED: 'srtRaw',
  UNPAIRED_SURROGATE: 'srtRaw', UTF8_BYTES_HIGH: 'srtRaw', NO_CUES: 'srtRaw',
  DIRECTION_INVALID: 'direction', SECONDS_TYPE: 'secondsRaw', SECONDS_FORMAT: 'secondsRaw', SECONDS_RANGE: 'secondsRaw'
});
const BLOCK_LINE_OFFSETS = Object.freeze({
  INDEX_FORMAT: 1, INDEX_RANGE: 1, INDEX_NOT_INCREASING: 1,
  TIMING_LINE_MISSING: 2, TIMING_FORMAT: 2, TIMESTAMP_RANGE: 2, CUE_START_NOT_BEFORE_END: 2,
  CUE_TEXT_MISSING: 3, CUE_TEXT_LINES_HIGH: 13, CUE_TEXT_LINE_TOO_LONG: 3, SHIFT_OUT_OF_BOUNDS: 2
});
export function isCoreError(error) {
  if (!exactRecord(error, ['code', 'field', 'line', 'cueIndex']) || !ERROR_CODES.includes(error.code)) return false;
  if (Object.hasOwn(SCALAR_ERROR_FIELDS, error.code)) {
    return error.field === SCALAR_ERROR_FIELDS[error.code] && error.line === null && error.cueIndex === null;
  }
  if (error.field !== 'srtRaw' || !integer(error.line, 1, LIMITS.rawCodeUnits + 1) || !integer(error.cueIndex, 1, LIMITS.cues + 1)) return false;
  if (error.code === 'CUE_COUNT_HIGH') return error.cueIndex === 2001 && error.line >= 8001;
  if (error.code === 'MISSING_CUE_SEPARATOR') {
    // The index-like text is inside the preceding cue, possibly its first text
    // line; its ordinal names the next cue, before a separator exists.
    return error.cueIndex >= 2 && error.line >= 4 * (error.cueIndex - 2) + 3;
  }
  if (error.cueIndex > LIMITS.cues || (error.code === 'INDEX_NOT_INCREASING' && error.cueIndex < 2)) return false;
  return Object.hasOwn(BLOCK_LINE_OFFSETS, error.code) && error.line >= 4 * (error.cueIndex - 1) + BLOCK_LINE_OFFSETS[error.code];
}
function denseArray(value, min, max) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return false;
  const length = Object.getOwnPropertyDescriptor(value, 'length');
  if (!length || !Object.hasOwn(length, 'value') || length.enumerable || !integer(length.value, min, max)) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== length.value + 1 || keys.at(-1) !== 'length') return false;
  for (let i = 0; i < length.value; i++) {
    if (keys[i] !== String(i)) return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, keys[i]);
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return false;
  }
  return true;
}
const INDEX_SHAPE = /^[0-9]{1,6}(?![\s\S])/;
const TIMING_SHAPE = /^[0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3}[ \t]+-->[ \t]+[0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3}(?![\s\S])/;
function textUtf8Bytes(line, budget) {
  if (typeof line !== 'string' || line.length < 1 || line.length > 2 * LIMITS.codePoints || /^[ \t]*(?![\s\S])/.test(line)) return -1;
  let points = 0;
  let bytes = 0;
  for (let i = 0; i < line.length; i++) {
    const unit = line.charCodeAt(i);
    if (unit === 0 || unit === 10 || unit === 13 || ++points > LIMITS.codePoints) return -1;
    if (unit <= 0x7f) bytes++;
    else if (unit <= 0x7ff) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      const low = line.charCodeAt(++i);
      if (!(low >= 0xdc00 && low <= 0xdfff)) return -1;
      bytes += 4;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return -1;
    else bytes += 3;
    if (bytes > budget) return -1;
  }
  return bytes;
}
function isSummary(value, cue, shifted) {
  return exactRecord(value, ['cueOrdinal', 'indexRaw', 'start', 'end'])
    && value.cueOrdinal === cue.cueOrdinal && value.indexRaw === cue.indexRaw
    && value.start === formatTimestamp(shifted ? cue.shiftedStartMs : cue.originalStartMs)
    && value.end === formatTimestamp(shifted ? cue.shiftedEndMs : cue.originalEndMs);
}
export function isShiftSuccess(result) {
  if (!exactRecord(result, ['direction', 'secondsRaw', 'shiftMilliseconds', 'cueCount', 'inputUtf8Bytes', 'outputUtf8Bytes', 'firstInputCue', 'lastInputCue', 'firstOutputCue', 'lastOutputCue', 'cues', 'srtText'])) return false;
  if (!['earlier', 'later'].includes(result.direction)) return false;
  const seconds = parseSecondsToMs(result.secondsRaw);
  if (!seconds.ok || seconds.value !== result.shiftMilliseconds) return false;
  if (!integer(result.cueCount, 1, LIMITS.cues) || !denseArray(result.cues, result.cueCount, result.cueCount)) return false;
  if (!integer(result.inputUtf8Bytes, 1, LIMITS.utf8Bytes) || !integer(result.outputUtf8Bytes, 1, result.inputUtf8Bytes + 1)) return false;
  if (typeof result.srtText !== 'string' || result.srtText.length === 0 || result.srtText.length > LIMITS.rawCodeUnits + 1 || !result.srtText.endsWith('\n')) return false;
  const delta = result.direction === 'earlier' ? -result.shiftMilliseconds : result.shiftMilliseconds;
  let lastIndex = 0;
  let cursor = 0;
  let outputBytes = 0;
  // Match the canonical serialization incrementally. No full parser, shift,
  // second complete output string or unbounded encoding allocation is needed.
  const match = (chunk, bytes = chunk.length) => {
    if (cursor + chunk.length > result.srtText.length || outputBytes + bytes > result.outputUtf8Bytes || !result.srtText.startsWith(chunk, cursor)) return false;
    cursor += chunk.length; outputBytes += bytes; return true;
  };
  for (let i = 0; i < result.cues.length; i++) {
    const c = result.cues[i];
    if (!exactRecord(c, ['cueOrdinal', 'indexRaw', 'originalStartMs', 'originalEndMs', 'shiftedStartMs', 'shiftedEndMs', 'textLines'])) return false;
    if (c.cueOrdinal !== i + 1 || typeof c.indexRaw !== 'string' || !INDEX_SHAPE.test(c.indexRaw) || Number(c.indexRaw) <= lastIndex) return false;
    if (![c.originalStartMs, c.originalEndMs, c.shiftedStartMs, c.shiftedEndMs].every(n => integer(n, 0, LIMITS.timestamp))) return false;
    if (c.originalStartMs >= c.originalEndMs || c.shiftedStartMs !== c.originalStartMs + delta || c.shiftedEndMs !== c.originalEndMs + delta) return false;
    if (!denseArray(c.textLines, 1, LIMITS.textLines)) return false;
    if (i > 0 && !match('\n')) return false;
    if (!match(`${c.indexRaw}\n${formatTimestamp(c.shiftedStartMs)} --> ${formatTimestamp(c.shiftedEndMs)}\n`)) return false;
    for (let j = 0; j < c.textLines.length; j++) {
      const line = c.textLines[j];
      if (typeof line !== 'string' || cursor + line.length + 1 > result.srtText.length) return false;
      const bytes = textUtf8Bytes(line, result.outputUtf8Bytes - outputBytes - 1);
      if (bytes < 0) return false;
      if (INDEX_SHAPE.test(line) && j + 1 < c.textLines.length && typeof c.textLines[j + 1] === 'string' && TIMING_SHAPE.test(c.textLines[j + 1])) return false;
      if (!match(line, bytes) || !match('\n')) return false;
    }
    lastIndex = Number(c.indexRaw);
  }
  return cursor === result.srtText.length && outputBytes === result.outputUtf8Bytes
    && isSummary(result.firstInputCue, result.cues[0], false) && isSummary(result.lastInputCue, result.cues.at(-1), false)
    && isSummary(result.firstOutputCue, result.cues[0], true) && isSummary(result.lastOutputCue, result.cues.at(-1), true);
}
export function isTerminal(value) {
  if (!exactRecord(value, ['type', 'jobId', 'revision', 'pageGeneration', 'outcome']) || !tokensValid(value)) return false;
  const out = value.outcome;
  return value.type === 'success'
    ? exactRecord(out, ['ok', 'result']) && out.ok === true && isShiftSuccess(out.result)
    : value.type === 'failure' && exactRecord(out, ['ok', 'error']) && out.ok === false && isCoreError(out.error);
}
