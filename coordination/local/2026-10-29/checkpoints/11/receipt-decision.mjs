// Pure offline adapter. This file never loads the DLL, opens handles or invokes CDP.
import { evaluateGenerationSnapshot } from './generation-decision.mjs';

const exact = (v, keys) => !!v && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));
const pid = (v) => Number.isInteger(v) && v > 0 && v <= 0xffffffff;
const uint = (v) => Number.isInteger(v) && v >= 0 && v <= 0xffffffff;
const tick = (v, positive = false) => typeof v === 'string' && /^(0|[1-9][0-9]{0,19})$/.test(v)
  && BigInt(v) <= 0xffffffffffffffffn && (!positive || BigInt(v) > 0n);
const label = (v) => typeof v === 'string' && v.length > 0 && v.length <= 128 && !/[\x00-\x1f]/.test(v);
const guid = (v) => typeof v === 'string' && /^[0-9a-f]{32}$/.test(v);
const nativePath = (v) => typeof v === 'string' && /^[a-z]:[\\/]/i.test(v) && v.length <= 32768 && !v.includes('\0');
const rejected = (code) => ({ decision: 'REJECT', executionAuthorized: false, scope: 'Pure receipt consistency only; no native acceptance or execution authorization.', issues: [{ severity: 'REJECT', code }], rows: [] });

// JSON.parse alone discards duplicate keys. Check the exact raw CDP bytes too.
function rawResult(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > 1048576) throw new Error('RAW_CDP_SIZE');
  const parsed = JSON.parse(text);
  let i = 0;
  const ws = () => { while (/\s/.test(text[i] || '') && i < text.length) i++; };
  const string = () => {
    const start = i++;
    while (i < text.length) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text[i++] === '"') return JSON.parse(text.slice(start, i));
    }
    throw new Error('RAW_STRING');
  };
  const value = (depth) => {
    if (depth > 16) throw new Error('RAW_DEPTH');
    ws();
    if (text[i] === '{') {
      i++; ws(); const seen = new Set();
      if (text[i] === '}') { i++; return; }
      while (i < text.length) {
        ws(); if (text[i] !== '"') throw new Error('RAW_KEY');
        const key = string(); if (seen.has(key)) throw new Error('RAW_DUPLICATE_KEY'); seen.add(key);
        ws(); if (text[i++] !== ':') throw new Error('RAW_COLON');
        value(depth + 1); ws();
        if (text[i] === '}') { i++; return; }
        if (text[i++] !== ',') throw new Error('RAW_COMMA');
      }
    } else if (text[i] === '[') {
      i++; ws(); if (text[i] === ']') { i++; return; }
      while (i < text.length) {
        value(depth + 1); ws(); if (text[i] === ']') { i++; return; }
        if (text[i++] !== ',') throw new Error('RAW_ARRAY_COMMA');
      }
    } else if (text[i] === '"') { string(); return; }
    else { const start = i; while (i < text.length && !/[\s,}\]]/.test(text[i])) i++; if (i === start) throw new Error('RAW_VALUE'); return; }
    throw new Error('RAW_TRUNCATED');
  };
  value(0); ws(); if (i !== text.length) throw new Error('RAW_TRAILING');
  if (!exact(parsed, ['processInfo']) || !Array.isArray(parsed.processInfo) || !parsed.processInfo.length || parsed.processInfo.length > 1024) throw new Error('RAW_SCHEMA');
  for (const r of parsed.processInfo) if (!exact(r, ['id', 'type', 'cpuTime']) || !pid(r.id) || typeof r.type !== 'string' || !r.type || r.type.length > 256 || !Number.isFinite(r.cpuTime) || r.cpuTime < 0) throw new Error('RAW_ROW');
  return parsed;
}

function validateNativeEnvelope(r, kind) {
  if (!exact(r, ['schemaVersion', 'kind', 'captureId', 'status', 'qpcFrequency', 'startQpc', 'endQpc', 'rawCdpJson', 'executionAuthorized', 'handlesHeldAtSave', 'expected', 'initialJobPids', 'retained', 'errors'])
      || r.schemaVersion !== 2 || r.kind !== kind || !guid(r.captureId)
      || r.executionAuthorized !== false || r.handlesHeldAtSave !== true) return rejected('NATIVE_RECEIPT_SCHEMA_OR_LIFETIME');
  if (r.status !== 'COMPLETE_DATA_ONLY' || !Array.isArray(r.errors) || r.errors.length) return rejected('NATIVE_CAPTURE_NOT_COMPLETE');
  if (!tick(r.qpcFrequency, true) || !tick(r.startQpc) || !tick(r.endQpc) || BigInt(r.endQpc) < BigInt(r.startQpc)) return rejected('NATIVE_CLOCK_INVALID');
  const expected = r.expected;
  if (!exact(expected, ['browserPid', 'browserCreationFileTime', 'jobId', 'desktopId', 'imagePath']) || !pid(expected.browserPid)
      || !tick(expected.browserCreationFileTime, true) || !label(expected.jobId) || !label(expected.desktopId) || !nativePath(expected.imagePath)) return rejected('NATIVE_EXPECTED_BOUNDARY_INVALID');
  if (!Array.isArray(r.initialJobPids) || !r.initialJobPids.length || r.initialJobPids.length > 128 || !r.initialJobPids.every(pid)
      || new Set(r.initialJobPids).size !== r.initialJobPids.length || !r.initialJobPids.includes(expected.browserPid)) return rejected('NATIVE_JOB_PID_LIST_INVALID');
  if (!Array.isArray(r.retained) || r.retained.length !== r.initialJobPids.length) return rejected('NATIVE_HELD_JOB_COVERAGE_MISSING');
  const seen = new Set(), handles = new Set();
  for (const h of r.retained) {
    if (!exact(h, ['pid', 'handleToken', 'openedQpc', 'closedQpc', 'sameHandle', 'before', 'after']) || !pid(h.pid) || seen.has(h.pid) || !r.initialJobPids.includes(h.pid)
        || !guid(h.handleToken) || handles.has(h.handleToken) || !tick(h.openedQpc) || h.closedQpc !== null || h.sameHandle !== true) return rejected('NATIVE_RETAINED_HANDLE_INVALID');
    seen.add(h.pid); handles.add(h.handleToken);
    for (const [stage, q] of [['before', h.before], ['after', h.after]]) {
      if (!exact(q, ['pid', 'queryStartQpc', 'qpc', 'creationFileTime', 'exitFileTime', 'jobId', 'imagePath', 'desktopId', 'running', 'inExpectedJob', 'desktopObjectVerified', 'win32kDisabled', 'mitigationQuerySucceeded', 'mitigationFlags', 'mitigationError', 'threads'])
          || q.pid !== h.pid || !tick(q.queryStartQpc) || !tick(q.qpc) || !tick(q.creationFileTime, true) || !tick(q.exitFileTime)
          || !label(q.jobId) || !label(q.desktopId) || !nativePath(q.imagePath) || !['running', 'inExpectedJob', 'desktopObjectVerified', 'win32kDisabled', 'mitigationQuerySucceeded'].every((k) => typeof q[k] === 'boolean')
          || !uint(q.mitigationFlags) || !uint(q.mitigationError) || !Array.isArray(q.threads) || q.threads.length > 512) return rejected('NATIVE_QUERY_SCHEMA_INVALID');
      if (BigInt(q.queryStartQpc) < BigInt(h.openedQpc) || BigInt(q.qpc) < BigInt(q.queryStartQpc)
          || (stage === 'before' && BigInt(q.qpc) > BigInt(r.startQpc)) || (stage === 'after' && BigInt(q.queryStartQpc) < BigInt(r.endQpc))) return rejected('NATIVE_QUERY_DID_NOT_BRACKET_CDP');
      if (q.running === (BigInt(q.exitFileTime) !== 0n)) return rejected('NATIVE_EXIT_TIME_LIVENESS_INCONSISTENT');
      if (q.win32kDisabled !== (q.mitigationQuerySucceeded && (q.mitigationFlags & 1) === 1)) return rejected('NATIVE_WIN32K_FLAG_UNPROVEN');
      if ((q.mitigationQuerySucceeded && q.mitigationError !== 0) || (!q.mitigationQuerySucceeded && q.mitigationFlags !== 0)) return rejected('NATIVE_MITIGATION_RESULT_INCONSISTENT');
      const tids = new Set();
      for (const t of q.threads) {
        if (!exact(t, ['tid', 'creationFileTime', 'sameDesktopObject']) || !pid(t.tid) || tids.has(t.tid) || !tick(t.creationFileTime, true) || t.sameDesktopObject !== true) return rejected('NATIVE_THREAD_DESKTOP_PROOF_INVALID');
        tids.add(t.tid);
      }
      if (q.desktopObjectVerified !== (q.threads.length > 0)) return rejected('NATIVE_DESKTOP_OBJECT_PROOF_MISSING');
    }
  }
  return null;
}

export function decideNativeReceipt(r) {
  const denied = validateNativeEnvelope(r, 'MU20_NATIVE_CONTINUOUS_HANDLE_CANDIDATE');
  if (denied) return denied;
  const expected = r.expected;
  let raw;
  try { raw = rawResult(r.rawCdpJson); } catch { return rejected('NATIVE_RAW_CDP_INVALID_OR_DUPLICATED'); }
  const decision = evaluateGenerationSnapshot({ schemaVersion: 1, expected, snapshot: { method: 'SystemInfo.getProcessInfo', target: 'browser', startQpc: r.startQpc, endQpc: r.endQpc, processInfo: raw.processInfo }, retained: r.retained });
  return { ...decision, captureId: r.captureId, nativeReceiptKind: r.kind, rawRows: raw.processInfo.length,
    scope: 'Pure metadata consistency. Primary must independently validate native provenance, persisted receipt/cleanup hashes and isolation. No execution authorization.' };
}

// M2: one fixed idle Node root only; no browser metrics or IPC/controlled-exit claim.
export function assessNodeCalibrationReceipt(r, launcherOwnedFixtureGenerations) {
  const denied = validateNativeEnvelope(r, 'MU20_NATIVE_NODE_PRIMITIVES_CALIBRATION');
  if (denied) return denied;
  if (r.rawCdpJson !== null) return rejected('NODE_CALIBRATION_IS_NOT_CDP');
  if (!Array.isArray(launcherOwnedFixtureGenerations) || launcherOwnedFixtureGenerations.length !== 1) return rejected('NODE_SINGLE_ROOT_LEDGER_REQUIRED');
  if (r.initialJobPids.length !== 1 || r.retained.length !== 1) return rejected('NODE_SINGLE_ROOT_JOB_COVERAGE_REQUIRED');
  const fixture = launcherOwnedFixtureGenerations[0], h = r.retained[0], rootPid = r.expected.browserPid;
  if (!exact(fixture, ['pid', 'creationFileTime']) || !pid(fixture.pid) || !tick(fixture.creationFileTime, true)) return rejected('NODE_LAUNCHER_LEDGER_INVALID');
  if (fixture.pid !== rootPid || r.initialJobPids[0] !== rootPid || h.pid !== rootPid) return rejected('NODE_ROOT_SET_MISMATCH');
  if (fixture.creationFileTime !== r.expected.browserCreationFileTime) return rejected('NODE_ROOT_LAUNCH_GENERATION_INVALID');
  const imageKey = (p) => p.replaceAll('/', '\\').toLowerCase();
  for (const q of [h.before, h.after]) {
    if (!q.inExpectedJob || q.jobId !== r.expected.jobId || q.creationFileTime !== fixture.creationFileTime || imageKey(q.imagePath) !== imageKey(r.expected.imagePath)) return rejected('NODE_FIXTURE_GENERATION_JOB_OR_IMAGE_INVALID');
    // Win32k denial never substitutes for the required desktop object proof here.
    if (q.desktopObjectVerified !== true || q.desktopId !== r.expected.desktopId) return rejected('NODE_BOUNDARY_PROOF_MISSING');
    if (!q.running) return rejected('NODE_EXIT_REQUIRES_SEPARATE_CASE_REVIEW');
  }
  return { decision: 'CALIBRATION_PRIMITIVES_DATA_ONLY', executionAuthorized: false, captureId: r.captureId,
    scope: 'Single fixed idle Node root primitive receipt consistency only. No IPC/controlled-exit completion, browser CDP, Edge isolation or execution authorization.' };
}

export function verifyCleanup(capture, cleanup) {
  if (!capture || typeof capture !== 'object' || !Array.isArray(capture.retained)
      || !exact(cleanup, ['captureId', 'savedBeforeClose', 'processHandleCloseAttempts', 'releasesSucceeded', 'queryJobHandleCloseAttempted', 'borrowedDesktopClosed', 'executionAuthorized', 'closedQpc'])
      || cleanup.captureId !== capture.captureId || cleanup.savedBeforeClose !== true || cleanup.processHandleCloseAttempts !== capture.retained?.length
      || cleanup.releasesSucceeded !== true || cleanup.queryJobHandleCloseAttempted !== true || cleanup.borrowedDesktopClosed !== false || cleanup.executionAuthorized !== false
      || !tick(cleanup.closedQpc) || !tick(capture.endQpc) || BigInt(cleanup.closedQpc) < BigInt(capture.endQpc)) return { status: 'REJECT', executionAuthorized: false };
  return { status: 'VERIFIED_CLEANUP_DATA_ONLY', executionAuthorized: false };
}
