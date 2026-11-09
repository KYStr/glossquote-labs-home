// Log Gap Audit — pure core (no DOM, network, or storage).
// Implements SPEC.md (spec-log-gap-audit-20261109) §inputsOutputs exactly:
// run(input) is a synchronous pure data transformation over adjacent rows
// in their original pasted order. All arithmetic uses BigInt; no Date, no float.

export const MAX_RECORDS_UNITS = 65536;
export const MAX_ROWS = 1000;
export const MAX_THRESHOLD_DIGITS = 18;
export const MAX_THRESHOLD = 999999999999999999n;
export const MAX_REPORT_BYTES = 2097152;
export const DEFAULT_THRESHOLD = '1000';
export const REPORT_FILENAME = 'log-gap-audit-report.json';

// Canonical integer grammar: "0", or a non-zero-leading integer of at most
// 18 ASCII digits. Shared by sequence, elapsedMs and threshold.
const INTEGER_RE = /^(0|[1-9][0-9]{0,17})$/;

function fail(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

// True when the string contains a lone high or lone low surrogate.
function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      // High surrogate: the next unit must be a low surrogate.
      if (i + 1 >= text.length) return true;
      const next = text.charCodeAt(i + 1);
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      // Low surrogate without a preceding high surrogate.
      return true;
    }
  }
  return false;
}

// Validate the input object shape. Unknown keys, missing keys, wrong types
// and accessor properties are all SCHEMA (field = the offending key, or null
// when the input itself is not a plain object).
function checkSchema(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('SCHEMA', null, null);
  }
  const names = Object.getOwnPropertyNames(input);
  for (const name of names) {
    if (name !== 'records' && name !== 'threshold') {
      return fail('SCHEMA', name, null);
    }
    const desc = Object.getOwnPropertyDescriptor(input, name);
    if (desc === undefined || typeof desc.get === 'function' || typeof desc.set === 'function') {
      return fail('SCHEMA', name, null);
    }
  }
  if (!Object.prototype.hasOwnProperty.call(input, 'records')) {
    return fail('SCHEMA', 'records', null);
  }
  if (!Object.prototype.hasOwnProperty.call(input, 'threshold')) {
    return fail('SCHEMA', 'threshold', null);
  }
  if (typeof input.records !== 'string') {
    return fail('SCHEMA', 'records', null);
  }
  if (typeof input.threshold !== 'string') {
    return fail('SCHEMA', 'threshold', null);
  }
  return null;
}

export function run(input) {
  // 0. Schema (unknown / missing / wrong type / accessor).
  const schemaError = checkSchema(input);
  if (schemaError) return schemaError;

  // 1. Threshold length and grammar first.
  if (!INTEGER_RE.test(input.threshold)) {
    return fail('THRESHOLD', 'threshold', null);
  }
  const threshold = BigInt(input.threshold);

  // 2. Records capacity (UTF-16 units), then empty, then row count.
  const records = input.records;
  if (records.length > MAX_RECORDS_UNITS) {
    return fail('INPUT_LIMIT', 'records', null);
  }
  if (records.length === 0) {
    return fail('EMPTY', 'records', null);
  }

  // Strip exactly one trailing LF before counting rows.
  let body = records;
  if (body.endsWith('\n')) body = body.slice(0, -1);
  if (body.length === 0) {
    return fail('EMPTY', 'records', null);
  }

  const lines = body.split('\n');
  if (lines.length > MAX_ROWS) {
    return fail('ROW_LIMIT', 'records', null);
  }

  // 3. Unpaired surrogate anywhere in the body.
  if (hasUnpairedSurrogate(body)) {
    return fail('UNICODE', 'records', null);
  }

  // 4. Per-row grammar: column count, then sequence, then elapsedMs.
  const parsed = [];
  for (let i = 0; i < lines.length; i += 1) {
    const row = i + 1;
    const fields = lines[i].split('\t');
    if (fields.length !== 2) {
      return fail('ROW_FORMAT', 'records', row);
    }
    const [sequenceText, timeText] = fields;
    if (!INTEGER_RE.test(sequenceText)) {
      return fail('SEQUENCE', 'records', row);
    }
    if (!INTEGER_RE.test(timeText)) {
      return fail('TIME', 'records', row);
    }
    parsed.push({ sequence: BigInt(sequenceText), time: BigInt(timeText) });
  }

  // 5. Adjacent comparison in original order. Sequence issues first,
  // then time issues, for the same pair.
  const findings = [];
  for (let i = 1; i < parsed.length; i += 1) {
    const prev = parsed[i - 1];
    const cur = parsed[i];
    const sequenceDelta = cur.sequence - prev.sequence;
    const timeDelta = cur.time - prev.time;
    const issues = [];
    if (sequenceDelta < 0n) {
      issues.push({ code: 'SEQ_REVERSE' });
    } else if (sequenceDelta === 0n) {
      issues.push({ code: 'SEQ_REPEAT' });
    } else if (sequenceDelta > 1n) {
      issues.push({
        code: 'SEQ_GAP',
        from: (prev.sequence + 1n).toString(),
        to: (cur.sequence - 1n).toString(),
        count: (sequenceDelta - 1n).toString(),
      });
    }
    if (timeDelta < 0n) {
      issues.push({ code: 'TIME_REVERSE' });
    } else if (timeDelta > threshold) {
      issues.push({ code: 'TIME_GAP' });
    }
    if (issues.length > 0) {
      findings.push({
        line: i + 1,
        prevLine: i,
        sequenceDelta: sequenceDelta.toString(),
        timeDelta: timeDelta.toString(),
        issues,
      });
    }
  }

  return { ok: true, result: { rowCount: parsed.length, findings } };
}

// Canonical report serialization: compact JSON, object own keys sorted by
// UTF-16 code units recursively, array order unchanged, one trailing LF,
// UTF-8 without BOM. Returns {ok:true,text,bytes} or
// {ok:false,error:{code:'OUTPUT_LIMIT',field:null,row:null}} when the report
// exceeds MAX_REPORT_BYTES. Never calls an input's toJSON: the value is
// rebuilt from plain data before stringifying.
function canonicalValue(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  const out = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = canonicalValue(value[key]);
  }
  return out;
}

export function serializeReport(result) {
  const text = JSON.stringify(canonicalValue(result)) + '\n';
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MAX_REPORT_BYTES) {
    return fail('OUTPUT_LIMIT', null, null);
  }
  return { ok: true, text, bytes };
}
